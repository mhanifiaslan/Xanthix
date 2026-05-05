import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/server/getServerSession';
import { listAdminPayments } from '@/lib/server/adminData';

export async function GET() {
  try {
    await requireAdminSession();
    const payments = await listAdminPayments(200);
    return NextResponse.json(payments);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
