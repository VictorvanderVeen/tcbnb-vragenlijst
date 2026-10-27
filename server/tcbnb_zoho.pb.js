/// <reference path="../pb_data/types.d.ts" />
// Zet elke nieuwe quizlead (tcbnb_quiz_inzendingen) door naar een lijst in Zoho Campaigns.
// Sleutels staan in /opt/pocketbase/tcbnb_zoho.env, logica in tcbnb_zoho_lib.js.
// Lukt Zoho niet, dan blijft de lead gewoon in PocketBase staan en komt de fout in de logs.

onRecordAfterCreateSuccess((e) => {
  const lib = require(`${__hooks}/tcbnb_zoho_lib.js`);
  try {
    lib.stuurNaarZoho(lib.leesEnv(), e.record);
  } catch (err) {
    $app.logger().error("tcbnb zoho", "id", e.record.id, "fout", String(err));
  }
  e.next();
}, "tcbnb_quiz_inzendingen");

// Eenmalig alle bestaande leads doorzetten: POST /api/tcbnb/zoho-inhalen (alleen superuser)
routerAdd("POST", "/api/tcbnb/zoho-inhalen", (e) => {
  const lib = require(`${__hooks}/tcbnb_zoho_lib.js`);
  const env = lib.leesEnv();
  const records = $app.findRecordsByFilter("tcbnb_quiz_inzendingen", "", "created", 0, 0);
  const fouten = [];
  records.forEach((r) => {
    try { lib.stuurNaarZoho(env, r); } catch (err) { fouten.push({ id: r.id, fout: String(err) }); }
  });
  return e.json(200, { totaal: records.length, gelukt: records.length - fouten.length, fouten });
}, $apis.requireSuperuserAuth());
