// GGH Admin Auth — Session Check
// GET: Check admin session status, return admin user if authenticated

import { apiHandler } from '@/lib/errors';
import { getAuthenticatedAdmin } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-auth-session');

export const GET = apiHandler(async () => {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    return successResponse({ authenticated: false });
  }

  logger.info('Admin session verified', { adminId: admin.id });

  return successResponse({
    authenticated: true,
    user: {
      id: admin.id,
      email: admin.email,
      nameEn: admin.nameEn,
      nameAr: admin.nameAr,
      phone: admin.phone,
      isActive: admin.isActive,
      customerId: admin.customerId,
      roleNames: admin.roleNames,
    },
  });
});
