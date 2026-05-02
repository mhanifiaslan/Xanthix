'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import { getMemberDoc } from '@/lib/server/organizations';
import { WORKSPACE_COOKIE } from '@/lib/server/workspace';

const switchSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('personal') }),
  z.object({ kind: z.literal('org'), orgId: z.string().min(1) }),
]);

export type SwitchWorkspaceInput = z.input<typeof switchSchema>;

const ONE_YEAR = 365 * 24 * 60 * 60;

export async function setActiveWorkspaceAction(
  raw: SwitchWorkspaceInput,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = switchSchema.parse(raw);

  if (input.kind === 'org') {
    const member = await getMemberDoc(input.orgId, session.uid);
    if (!member) {
      throw new Error('Bu kuruma üye değilsin; onun çalışma alanına geçemezsin.');
    }
  }

  const value = input.kind === 'personal' ? 'personal' : `org:${input.orgId}`;
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });

  // Layout-level invalidation; every page reads the workspace fresh from
  // the cookie on its next render.
  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}
