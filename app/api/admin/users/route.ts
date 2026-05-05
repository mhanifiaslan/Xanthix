import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/server/getServerSession';
import { listAdminUsers } from '@/lib/server/adminData';

export async function GET() {
  try {
    await requireAdminSession();
    const users = await listAdminUsers(200);
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
