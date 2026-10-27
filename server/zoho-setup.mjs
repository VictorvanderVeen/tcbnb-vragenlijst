// Eenmalige setup voor de Zoho Campaigns-koppeling.
// Gebruik: node zoho-setup.mjs <client_id> <client_secret> <code>
// De code komt uit de Zoho API-console (Self Client → Generate Code, scope ZohoCampaigns.contact.ALL)
// en is maar een paar minuten geldig. Het script zoekt zelf het datacenter, schrijft tcbnb_zoho.env
// (zonder lijst) en toont de lijsten in het account.
import { writeFileSync } from 'node:fs';

const [clientId, clientSecret, code] = process.argv.slice(2);
if (!code) {
  console.error('Gebruik: node zoho-setup.mjs <client_id> <client_secret> <code>');
  process.exit(1);
}

let dc, refreshToken, accessToken;
for (const kandidaat of ['eu', 'com', 'in', 'com.au']) {
  const url = `https://accounts.zoho.${kandidaat}/oauth/v2/token?grant_type=authorization_code` +
    `&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}`;
  const json = await (await fetch(url, { method: 'POST' })).json();
  if (json.refresh_token) {
    dc = kandidaat; refreshToken = json.refresh_token; accessToken = json.access_token;
    break;
  }
}
if (!dc) {
  console.error('Geen datacenter accepteerde de code. Is hij verlopen? Maak een nieuwe en probeer het binnen een paar minuten.');
  process.exit(1);
}

const env = `ZOHO_DC=${dc}\nZOHO_CLIENT_ID=${clientId}\nZOHO_CLIENT_SECRET=${clientSecret}\n` +
  `ZOHO_REFRESH_TOKEN=${refreshToken}\nZOHO_LISTKEY=\nZOHO_EXTRA_VELDEN=nee\n`;
writeFileSync(new URL('./tcbnb_zoho.env', import.meta.url), env, { mode: 0o600 });
console.log(`Datacenter: zoho.${dc}. tcbnb_zoho.env geschreven (ZOHO_LISTKEY nog leeg).\n`);

const lijsten = await (await fetch(
  `https://campaigns.zoho.${dc}/api/v1.1/getmailinglists?resfmt=JSON&range=100`,
  { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } },
)).json();
console.log('Lijsten in dit account (naam, aantal contacten, listkey):');
for (const l of lijsten.list_of_details || []) console.log(`- ${l.listname} (${l.noofcontacts}) → ${l.listkey}`);
if (!lijsten.list_of_details) console.log(JSON.stringify(lijsten, null, 2));
