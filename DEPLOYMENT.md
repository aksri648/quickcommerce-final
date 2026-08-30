# QuickBlink — Production Deployment Guide

The platform is designed for zero-downtime, fully automated deployment via **Render Blueprint (`render.yaml`)** or standard Docker / Kubernetes environments.

---

## Deploying to Render via Git

1. Push your repository to GitHub / GitLab.
2. In the Render Dashboard, select **New +** -> **Blueprint**.
3. Connect your repository. Render will automatically parse `render.yaml` and provision:
   - 1 Managed PostgreSQL Database (`quickcommerce-postgres`)
   - 1 Managed Redis Instance (`quickcommerce-redis`)
   - 1 Web Service for Express API Backend (`quickcommerce-api`)
   - 1 Background Worker Service for BullMQ & Outbox (`quickcommerce-worker`)
   - 4 Static Sites for the 4 PWAs (`customer-pwa`, `driver-pwa`, `store-admin-pwa`, `god-admin-pwa`)
4. Click **Apply Blueprint**.

---

## Environment Variables Configuration

| Variable | Target | Required | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | API & Worker | Yes | PostgreSQL connection string with connection pool params |
| `REDIS_URL` | API & Worker | Yes | Redis connection string for BullMQ and Lua distributed locks |
| `JWT_SECRET` | API & Worker | Yes | 256-bit cryptographically secure string |
| `HMAC_SECRET` | API & Worker | Yes | 256-bit secret used to salt and hash doorstep delivery OTPs |
| `PORT` | API | Yes | Port number (default: `4000`) |
| `TZ` | API & Worker | Yes | Must be set to `Asia/Kolkata` for accurate Indian 3-hour slot calculation |

---

## Zero-Downtime Migration Command
```bash
cd apps/api && bun x prisma migrate deploy
```
