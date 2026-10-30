// Maakt de twee collecties voor de vragenlijst over de vrijwilligersvergoeding (vergoeding/index.html):
//   - tcbnb_vergoeding_antwoorden: de antwoorden, zonder e-mailadres
//   - tcbnb_vergoeding_nieuws:     alleen e-mailadressen van wie nieuws over de uitkomst wil
// Twee losse collecties, zodat de antwoorden anoniem blijven. Iedereen mag aanmaken, niemand mag lezen
// (lezen gaat via de downloadpagina, zie formulier-data/pocketbase-setup.mjs).
//
//   node --env-file=../../me-timer/.env.migratie.local vergoeding-setup.mjs
//
// Bestaat een collectie al, dan slaat het script hem over.

const base = process.env.PB_URL;

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const { token } = await request('/api/collections/_superusers/auth-with-password', {
  method: 'POST',
  body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
});
const auth = { Authorization: token };

const tekst = (name, max = 300) => ({ name, type: 'text', max });
const created = { name: 'created', type: 'autodate', onCreate: true, onUpdate: false };

const COLLECTIES = {
  tcbnb_vergoeding_antwoorden: [
    tekst('voornaam', 60),
    tekst('wist_van_vergoeding', 40),
    { name: 'nog_gastgezin', type: 'bool' },
    tekst('leeftijd', 40),
    tekst('huishouden', 60),
    tekst('hoogte', 80),
    tekst('betekenis', 400),
    tekst('zonder_vergoeding', 40),
    tekst('als_vergoeding_stopt', 80),
    tekst('waarom_gestopt', 400),
    tekst('lastig', 1000),
    tekst('onverwacht_goed', 2000),
    tekst('onverwacht_minder', 2000),
    tekst('bron', 400),
    created,
  ],
  tcbnb_vergoeding_nieuws: [{ name: 'email', type: 'email', required: true }, created],
};

for (const [name, fields] of Object.entries(COLLECTIES)) {
  const bestaand = await fetch(`${base}/api/collections/${name}`, { headers: auth });
  if (bestaand.ok) { console.log(`${name}: bestaat al, overgeslagen`); continue; }
  await request('/api/collections', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name, type: 'base', fields,
      createRule: '', listRule: null, viewRule: null, updateRule: null, deleteRule: null,
    }),
  });
  console.log(`${name}: aangemaakt`);
}
