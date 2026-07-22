// GGH Auth — Logout

import { db } from '@/lib/db';
import { successResponse, clearSessionCookie, getSessionToken, errorResponse } from '@/lib/ggh/auth';

export async function POST() {
  try {
    const token = await getSessionToken();

    if (token) {
      // Deactivate session in database
      await db.session.updateMany({
        where: { token, isActive: true },
        data: { isActive: false },
      });
    }

    // Clear the session cookie
    await clearSessionCookie();

    return successResponse({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return errorResponse('Logout failed', 'LOGOUT_FAILED', 500);
  }
}
