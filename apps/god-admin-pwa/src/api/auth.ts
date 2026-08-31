import { createAuthClient } from '@neondatabase/auth';

const authBaseUrl = import.meta.env.VITE_NEON_AUTH_URL || 'http://localhost:4000/api/auth';

export const authClient = createAuthClient(authBaseUrl);

export const { signIn, signUp, signOut, useSession } = authClient;
