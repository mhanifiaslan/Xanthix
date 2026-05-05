// One-shot Cloud Logging fetch — used to grab stderr/Error entries from
// Cloud Run when gcloud isn't installed locally. Reads the service account
// from FIREBASE_SERVICE_ACCOUNT_PATH (.env.local), gets an access token via
// google-auth-library, and POSTs to logging.googleapis.com/v2/entries:list.
//
// Usage:
//   node scripts/fetch-logs.mjs [minutesBack=60] [filterFragment]
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

config({ path: '.env.local' });

const minutesBack = Number(process.argv[2] ?? 60);
const extraFilter = process.argv[3] ?? '';

const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!saPath) {
  console.error('FIREBASE_SERVICE_ACCOUNT_PATH not set');
  process.exit(1);
}
const sa = JSON.parse(readFileSync(saPath, 'utf8'));

const auth = new GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ['https://www.googleapis.com/auth/logging.read'],
});

const client = await auth.getClient();
const tokenResp = await client.getAccessToken();
const accessToken = typeof tokenResp === 'string' ? tokenResp : tokenResp.token;

const since = new Date(Date.now() - minutesBack * 60_000).toISOString();

const filter = [
  `resource.type="cloud_run_revision"`,
  `timestamp>="${since}"`,
  process.env.NO_SEVERITY ? '' : `severity>=ERROR`,
  extraFilter,
]
  .filter(Boolean)
  .join(' AND ');

console.error(`[fetch-logs] filter: ${filter}\n`);

const resp = await fetch('https://logging.googleapis.com/v2/entries:list', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resourceNames: [`projects/${sa.project_id}`],
    filter,
    orderBy: 'timestamp desc',
    pageSize: 50,
  }),
});

if (!resp.ok) {
  console.error(`HTTP ${resp.status}: ${await resp.text()}`);
  process.exit(2);
}

const data = await resp.json();
const entries = data.entries ?? [];
console.error(`[fetch-logs] ${entries.length} entries\n`);

for (const e of entries) {
  const ts = e.timestamp;
  const sev = e.severity;
  const log = (e.logName ?? '').split('/').pop();
  const msg =
    e.textPayload ??
    e.jsonPayload?.message ??
    JSON.stringify(e.jsonPayload ?? e.protoPayload ?? {}).slice(0, 500);
  console.log(`[${ts}] ${sev} ${log}`);
  console.log(msg);
  console.log('---');
}
