import 'server-only';
import { cookies } from 'next/headers';
import { getMemberDoc, getOrgDoc } from './organizations';

const COOKIE_NAME = 'xanthix_ws';

export type Workspace =
  | { kind: 'personal' }
  | { kind: 'org'; orgId: string; orgName: string };

export type WorkspaceKey = 'personal' | `org:${string}`;

export function workspaceKey(ws: Workspace): WorkspaceKey {
  return ws.kind === 'personal' ? 'personal' : `org:${ws.orgId}`;
}

export function parseWorkspaceKey(raw: string | undefined): WorkspaceKey {
  if (!raw) return 'personal';
  if (raw === 'personal') return 'personal';
  if (raw.startsWith('org:') && raw.length > 4) {
    return raw as `org:${string}`;
  }
  return 'personal';
}

/**
 * Reads the active workspace from the user's cookie and verifies the user
 * still has access to it. Falls back to 'personal' silently when the user
 * has been removed from a previously-active org.
 */
export async function getActiveWorkspace(uid: string): Promise<Workspace> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const key = parseWorkspaceKey(raw);
  if (key === 'personal') return { kind: 'personal' };

  const orgId = key.slice(4);
  const member = await getMemberDoc(orgId, uid);
  if (!member) return { kind: 'personal' };

  const org = await getOrgDoc(orgId);
  if (!org) return { kind: 'personal' };

  return { kind: 'org', orgId: org.id, orgName: org.name };
}

export { COOKIE_NAME as WORKSPACE_COOKIE };
