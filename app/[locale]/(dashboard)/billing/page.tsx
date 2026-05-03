import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { listActiveTokenPackages } from '@/lib/server/tokenPackages';
import {
  listPurchasesForOrg,
  listPurchasesForUser,
} from '@/lib/server/purchases';
import { getTokenBalance } from '@/lib/server/projects';
import { getOrgDoc, getMemberDoc } from '@/lib/server/organizations';
import { ORG_MANAGER_ROLES } from '@/types/organization';
import { isIyzicoConfigured } from '@/lib/iyzico/client';
import BillingClient from './BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const ws = await getActiveWorkspace(session.uid);

  let walletKind: 'user' | 'org';
  let orgId: string | null = null;
  let orgName: string | null = null;
  let canPurchase: boolean;

  if (ws.kind === 'org') {
    walletKind = 'org';
    orgId = ws.orgId;
    orgName = ws.orgName;
    const member = await getMemberDoc(orgId, session.uid);
    canPurchase = !!member && ORG_MANAGER_ROLES.includes(member.role);
  } else {
    walletKind = 'user';
    canPurchase = true;
  }

  const [packages, balance, purchases, org] = await Promise.all([
    listActiveTokenPackages(),
    getTokenBalance({ userId: session.uid, orgId }),
    orgId
      ? listPurchasesForOrg(orgId, 30)
      : listPurchasesForUser(session.uid, 30),
    orgId ? getOrgDoc(orgId) : Promise.resolve(null),
  ]);

  const paymentsEnabled = isIyzicoConfigured();

  return (
    <BillingClient
      locale={locale}
      walletKind={walletKind}
      orgName={orgName}
      canPurchase={canPurchase && paymentsEnabled}
      paymentsEnabled={paymentsEnabled}
      balance={balance}
      planLabel={
        walletKind === 'org'
          ? `Kurum cüzdanı · ${org?.subscriptionTier ?? 'trial'}`
          : 'Bireysel cüzdan'
      }
      packages={packages.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tokenAmount: p.tokenAmount,
        bonusTokens: p.bonusTokens,
        price: p.price,
        currency: p.currency,
        isPopular: p.isPopular,
      }))}
      purchases={purchases.map((p) => ({
        id: p.id,
        packageName: p.packageName,
        tokenAmount: p.tokenAmount,
        bonusTokens: p.bonusTokens,
        price: p.price,
        currency: p.currency,
        status: p.status,
        createdAt:
          typeof p.createdAt === 'string'
            ? p.createdAt
            : p.createdAt?.toISOString() ?? null,
      }))}
    />
  );
}
