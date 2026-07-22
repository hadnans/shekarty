// GGH Admin Auth — Logout
// POST: Clear admin session cookie and deactivate session

import { apiHandler } from '@/lib/errors';
import { adminLogout } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-auth-logout');

export const POST = apiHandler(async () => {
  await adminLogout();

  logger.info('Admin logged out');

  return successResponse({ message: 'Logged out successfully' }, 'Logout successful');
});
