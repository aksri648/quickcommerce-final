import { prisma } from '../../database/prisma';
import { generateToken } from '../../middleware/auth';
import { UserRole, ErrorCodes, DEMO_USERS } from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';

export class AuthService {
  /**
   * Fast dev & demo login allowing client testing across all 5 roles
   */
  async devLogin(role: UserRole, email?: string, storeId?: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(ErrorCodes.UNAUTHORIZED as any, 'Dev login is disabled in production', 403);
    }
    const targetEmail = email || DEMO_USERS[role]?.email || `demo-${role.toLowerCase()}@quickcommerce.dev`;

    let user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: {
        storeStaff: { where: { isActive: true } },
        driverProfile: true,
      },
    });

    if (!user) {
      // Auto-create demo user if not existing
      user = await prisma.user.create({
        data: {
          auth0Id: `auth0|dev-${role.toLowerCase()}-${Date.now()}`,
          email: targetEmail,
          name: DEMO_USERS[role]?.name || `Demo ${role}`,
          role,
          isActive: true,
        },
        include: {
          storeStaff: true,
          driverProfile: true,
        },
      });

      if (role === UserRole.CUSTOMER) {
        await prisma.customerProfile.create({
          data: { userId: user.id },
        });
      } else if (role === UserRole.STORE_ADMIN || role === UserRole.STORE_STAFF) {
        let targetStoreId = storeId;
        if (!targetStoreId) {
          const firstStore = await prisma.store.findFirst();
          targetStoreId = firstStore?.id;
        }
        if (targetStoreId) {
          await prisma.storeStaff.create({
            data: { userId: user.id, storeId: targetStoreId, role }
          });
          user.storeStaff = [{ storeId: targetStoreId }] as any;
        }
      }
    }

    const assignedStoreId =
      storeId ||
      user.storeStaff?.[0]?.storeId ||
      user.driverProfile?.storeId;

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      storeId: assignedStoreId,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        storeId: assignedStoreId,
      },
    };
  }

  /**
   * Get current authenticated user profile details
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        storeStaff: {
          include: { store: true },
        },
        driverProfile: {
          include: { store: true },
        },
      },
    });

    if (!user) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'User profile not found', 404);
    }

    return user;
  }
}

export const authService = new AuthService();
