import { prisma, withTransactionRetry } from '../../database/prisma';
import {
  ErrorCodes,
  DeliverySlotFilterSchema,
  UpdateSlotCapacitySchema,
  SlotStatus,
  DEFAULT_DELIVERY_SLOTS,
  DEFAULT_TIMEZONE,
  AuditAction,
  UserRole,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { z } from 'zod';

export class SlotsService {
  /**
   * Ensure standard delivery slots exist for a store and date, then calculate real-time status
   */
  async getOrGenerateSlotsForDate(storeId: string, dateStr: string) {
    // 1. Check existing slots
    let slots = await prisma.deliverySlot.findMany({
      where: { storeId, date: dateStr },
      orderBy: { startTime: 'asc' },
    });

    // If none exist for this date, seed default 4 windows
    if (slots.length === 0) {
      await withTransactionRetry(async (tx) => {
        for (const defaultSlot of DEFAULT_DELIVERY_SLOTS) {
          await tx.deliverySlot.upsert({
            where: {
              storeId_date_startTime_endTime: {
                storeId,
                date: dateStr,
                startTime: defaultSlot.startTime,
                endTime: defaultSlot.endTime,
              },
            },
            create: {
              storeId,
              date: dateStr,
              startTime: defaultSlot.startTime,
              endTime: defaultSlot.endTime,
              capacity: defaultSlot.capacity,
              bookingCutoffMinutes: defaultSlot.cutoffMinutes,
              bookedCount: 0,
              status: SlotStatus.OPEN,
              isActive: true,
            },
            update: {},
          });
        }
      });

      slots = await prisma.deliverySlot.findMany({
        where: { storeId, date: dateStr },
        orderBy: { startTime: 'asc' },
      });
    }

    // 2. Compute dynamic real-time slot status in Asia/Kolkata timezone
    const now = new Date();
    // Convert current time to Asia/Kolkata date and time
    const kolkataDateStr = now.toLocaleDateString('en-CA', { timeZone: DEFAULT_TIMEZONE }); // YYYY-MM-DD
    const kolkataTimeStr = now.toLocaleTimeString('en-GB', { timeZone: DEFAULT_TIMEZONE, hour: '2-digit', minute: '2-digit' }); // HH:mm

    const isToday = dateStr === kolkataDateStr;
    const isPastDate = dateStr < kolkataDateStr;

    return slots.map((slot) => {
      const availableCapacity = Math.max(0, slot.capacity - slot.bookedCount);
      let calculatedStatus: SlotStatus = slot.status;

      if (!slot.isActive) {
        calculatedStatus = SlotStatus.CLOSED;
      } else if (isPastDate) {
        calculatedStatus = SlotStatus.COMPLETED;
      } else if (isToday) {
        const [slotStartH, slotStartM] = slot.startTime.split(':').map(Number);
        const [slotEndH, slotEndM] = slot.endTime.split(':').map(Number);
        const [nowH, nowM] = kolkataTimeStr.split(':').map(Number);

        const slotStartMinutes = slotStartH * 60 + slotStartM;
        const slotEndMinutes = slotEndH * 60 + slotEndM;
        const nowMinutes = nowH * 60 + nowM;
        const cutoffMinutes = slotStartMinutes - slot.bookingCutoffMinutes;

        if (nowMinutes >= slotEndMinutes) {
          calculatedStatus = SlotStatus.COMPLETED;
        } else if (nowMinutes >= slotStartMinutes) {
          calculatedStatus = SlotStatus.IN_PROGRESS;
        } else if (nowMinutes >= cutoffMinutes) {
          calculatedStatus = SlotStatus.CLOSED; // Passed booking cutoff
        } else if (availableCapacity <= 0) {
          calculatedStatus = SlotStatus.FULL;
        } else {
          calculatedStatus = SlotStatus.OPEN;
        }
      } else {
        // Future date
        if (availableCapacity <= 0) {
          calculatedStatus = SlotStatus.FULL;
        } else {
          calculatedStatus = SlotStatus.OPEN;
        }
      }

      const label = `${slot.startTime} – ${slot.endTime}`;
      let availabilityLabel: 'Available' | 'Few slots left' | 'Fully booked' | 'Closed' = 'Available';

      if (calculatedStatus === SlotStatus.FULL) {
        availabilityLabel = 'Fully booked';
      } else if (calculatedStatus === SlotStatus.CLOSED || calculatedStatus === SlotStatus.COMPLETED) {
        availabilityLabel = 'Closed';
      } else if (availableCapacity <= 5) {
        availabilityLabel = 'Few slots left';
      }

      return {
        id: slot.id,
        storeId: slot.storeId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        formattedTimeWindow: label,
        bookingCutoffMinutes: slot.bookingCutoffMinutes,
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        availableCapacity,
        status: calculatedStatus,
        availabilityLabel,
        isActive: slot.isActive,
        version: slot.version,
      };
    });
  }

  /**
   * Concurrency-safe capacity and configuration update by store admin
   */
  async updateSlotConfig(
    slotId: string,
    data: z.infer<typeof UpdateSlotCapacitySchema>,
    actorId: string,
    actorRole: UserRole
  ) {
    return await withTransactionRetry(async (tx) => {
      const slot = await tx.deliverySlot.findUnique({ where: { id: slotId } });
      if (!slot) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Delivery slot not found', 404);
      }

      // Optimistic concurrency check
      if (data.expectedVersion !== undefined && slot.version !== data.expectedVersion) {
        throw new AppError(
          ErrorCodes.CONCURRENT_MODIFICATION,
          'Slot configuration was updated concurrently. Please refresh before saving.',
          409
        );
      }

      // Invariant: Do not allow capacity to be reduced below current bookings
      if (data.capacity < slot.bookedCount) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Cannot reduce slot capacity to ${data.capacity} because ${slot.bookedCount} orders are already booked for this slot.`,
          400
        );
      }

      const updated = await tx.deliverySlot.update({
        where: { id: slotId },
        data: {
          capacity: data.capacity,
          bookingCutoffMinutes: data.bookingCutoffMinutes ?? slot.bookingCutoffMinutes,
          isActive: data.isActive ?? slot.isActive,
          version: { increment: 1 },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          storeId: slot.storeId,
          action: AuditAction.UPDATE,
          entityType: 'DeliverySlot',
          entityId: slot.id,
          oldValue: { capacity: slot.capacity, isActive: slot.isActive },
          newValue: { capacity: updated.capacity, isActive: updated.isActive },
        },
      });

      return updated;
    });
  }
}

export const slotsService = new SlotsService();
