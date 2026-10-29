// Stuurt alle bestaande quizleads alsnog naar Zoho Campaigns (via de route in tcbnb_zoho.pb.js).
// Gebruik: node --env-file="../../me-timer/.env.migratie.local" zoho-inhalen.mjs
const url = process.env.PB_URL;
const auth = await (await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
})).json();
if (!auth.token) { console.error('Inloggen bij PocketBase mislukt.'); process.exit(1); }

const res = await (await fetch(`${url}/api/tcbnb/zoho-inhalen`, { method: 'POST', headers: { Authorization: auth.token } })).json();
console.log(`Leads: ${res.totaal}, naar Zoho: ${res.gelukt}`);
for (const f of res.fouten || []) console.log(`- ${f.id}: ${f.fout}`);
