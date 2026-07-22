// GGH Auth — Check session

import { successResponse, getAuthenticatedCustomer, errorResponse } from '@/lib/ggh/auth';

export async function GET() {
  try {
    const customer = await getAuthenticatedCustomer();

    if (!customer) {
      return successResponse({ authenticated: false });
    }

    return successResponse({
      authenticated: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        firstName: customer.firstName,
        lastName: customer.lastName,
        nameAr: customer.nameAr,
        preferredLang: customer.preferredLang,
        wholesaleStatus: customer.wholesaleStatus,
        isVerified: customer.isVerified,
      },
    });
  } catch (err) {
    console.error('Session check error:', err);
    return errorResponse('Session check failed', 'SESSION_ERROR', 500);
  }
}
