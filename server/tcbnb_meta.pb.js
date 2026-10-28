/// <reference path="../pb_data/types.d.ts" />
// Meldt elke nieuwe quizlead (tcbnb_quiz_inzendingen) via de Meta Conversions API aan de pixel.
// Sleutels en de aan/uit-schakelaar staan in /opt/pocketbase/tcbnb_meta.env, logica in tcbnb_meta_lib.js.
// Lukt Meta niet, dan blijft de lead gewoon in PocketBase staan en komt de fout in de logs.

onRecordAfterCreateSuccess((e) => {
  const lib = require(`${__hooks}/tcbnb_meta_lib.js`);
  try {
    lib.stuurLead(lib.leesEnv(), e.record);
  } catch (err) {
    $app.logger().error("tcbnb meta", "id", e.record.id, "fout", String(err));
  }
  e.next();
}, "tcbnb_quiz_inzendingen");

// Testmelding naar Events Manager → Gebeurtenissen testen: POST /api/tcbnb/meta-test {"test_code": "TEST1234"}
// Stuurt een nep-lead (test@example.com), werkt ook als META_CAPI_AAN nog op nee staat. Alleen superuser.
routerAdd("POST", "/api/tcbnb/meta-test", (e) => {
  const lib = require(`${__hooks}/tcbnb_meta_lib.js`);
  const code = String((e.requestInfo().body || {}).test_code || "");
  if (!code) return e.json(400, { fout: "test_code ontbreekt (staat in Events Manager → Gebeurtenissen testen)" });
  const col = $app.findCollectionByNameOrId("tcbnb_quiz_inzendingen");
  const nep = new Record(col);
  nep.set("email", "test@example.com");
  nep.set("voornaam", "Test");
  nep.set("profiel", "De Keukentafel");
  nep.set("bron", "/wat-voor-een-gastgezin-ben-jij/ · test");
  nep.set("event_id", "tcbnb-test-" + Date.now());
  try {
    return e.json(200, lib.stuur(lib.leesEnv(), [lib.bouwEvent(nep)], code));
  } catch (err) {
    return e.json(502, { fout: String(err) });
  }
}, $apis.requireSuperuserAuth());
