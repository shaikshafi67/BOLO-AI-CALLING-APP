import dotenv from 'dotenv';
import { cert } from 'firebase-admin/app';

dotenv.config({ quiet: true });

/// Adds a website domain to Firebase Authentication's authorized domains, so
/// Google sign-in works there:  npm run add:domain -- boloai.shaikshafi.in
async function main() {
  const domain = process.argv[2]?.trim();
  if (!domain) throw new Error('Usage: npm run add:domain -- <domain>');
  const credential = cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\n/g, '\n'),
  });
  const { access_token } = await credential.getAccessToken();
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${process.env.FIREBASE_PROJECT_ID}/config`;
  const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  const config = (await (await fetch(url, { headers })).json()) as { authorizedDomains: string[] };
  if (config.authorizedDomains.includes(domain)) {
    console.log(`${domain} is already authorized:`, config.authorizedDomains);
    return;
  }
  const res = await fetch(`${url}?updateMask=authorizedDomains`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ authorizedDomains: [...config.authorizedDomains, domain] }),
  });
  const body = (await res.json()) as { authorizedDomains?: string[]; error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  console.log('Authorized domains now:', body.authorizedDomains);
}

main().catch((e) => {
  console.error('Failed:', e.message ?? e);
  process.exit(1);
});
