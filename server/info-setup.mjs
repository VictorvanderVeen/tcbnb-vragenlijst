// Maakt de collectie voor het campagneformulier 'informatie aanvragen' (info/index.html):
//   tcbnb_info_aanvragen: één rij per aanvraag. Telefoon ingevuld = route 'bellen', leeg = 'folder'.
// Iedereen mag aanmaken (het formulier), niemand mag lezen (lezen gaat via de downloadpagina / superuser).
//
//   node --env-file=../../me-timer/.env.migratie.local info-setup.mjs
//
// Bestaat de collectie al, dan slaat het script hem over.

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
const name = 'tcbnb_info_aanvragen';
const fields = [
  { ...tekst('voornaam', 80), required: true },
  { name: 'email', type: 'email', required: true },
  tekst('telefoon', 40),
  { name: 'route', type: 'select', maxSelect: 1, values: ['folder', 'bellen'], required: true },
  { name: 'dagdeel', type: 'select', maxSelect: 1, values: ['ochtend', 'middag', 'avond'] },
  { name: 'nieuwsbrief', type: 'bool' },
  { name: 'status', type: 'select', maxSelect: 1, values: ['nieuw', 'folder verstuurd', 'gebeld', 'geen gehoor', 'afgerond'] },
  tekst('bron', 400),
  tekst('utm_source', 200), tekst('utm_medium', 200), tekst('utm_campaign', 200), tekst('utm_content', 200),
  tekst('fbclid', 500), tekst('event_id', 100), tekst('user_agent', 500),
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
];

const bestaand = await fetch(`${base}/api/collections/${name}`, { headers: auth });
if (bestaand.ok) {
  console.log(`${name}: bestaat al, id ${(await bestaand.json()).id}`);
} else {
  const c = await request('/api/collections', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name, type: 'base', fields,
      createRule: '', listRule: null, viewRule: null, updateRule: null, deleteRule: null,
    }),
  });
  console.log(`${name}: aangemaakt, id ${c.id}`);
}
