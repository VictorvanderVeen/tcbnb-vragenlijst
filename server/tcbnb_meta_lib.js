// Meta Conversions API voor de Takecarebnb-quiz: meldt elke lead via de server aan pixel 2226309004976149.
// tcbnb_meta.env bevat: META_PIXEL_ID, META_CAPI_TOKEN, META_CAPI_AAN (ja/nee) en optioneel META_TEST_CODE
// (dan komen de events alleen in Events Manager → Gebeurtenissen testen, niet in de campagne).

function leesEnv() {
  const tekst = toString($os.readFile(__hooks + "/../tcbnb_meta.env"));
  const env = {};
  tekst.split("\n").forEach((r) => {
    const i = r.indexOf("=");
    if (i > 0 && r[0] !== "#") env[r.slice(0, i).trim()] = r.slice(i + 1).trim();
  });
  return env;
}

// Meta wil persoonsgegevens genormaliseerd en SHA-256-gehasht
const hash = (s) => $security.sha256(String(s).trim().toLowerCase());

// 06-12345678, +31 6 1234 5678 en 0031612345678 worden allemaal 31612345678
function telefoon(t) {
  let d = String(t).replace(/\D/g, "");
  if (d.indexOf("00") === 0) d = d.slice(2);
  else if (d.indexOf("0") === 0) d = "31" + d.slice(1);
  return d.length >= 9 ? d : "";
}

// bron = "<paginapad> · <referrer>" (embedcode) of alleen de referrer (oude embed)
function paginaUrl(bron) {
  const pad = String(bron).split(" · ")[0];
  if (pad.indexOf("/") === 0) return "https://takecarebnb.org" + pad;
  if (pad.indexOf("https://takecarebnb.org") === 0) return pad;
  return "https://takecarebnb.org/wat-voor-een-gastgezin-ben-jij/";
}

function bouwEvent(record) {
  const ud = { country: [hash("nl")] };
  const email = record.getString("email");
  if (email) ud.em = [hash(email)];
  const tel = telefoon(record.getString("telefoon"));
  if (tel) ud.ph = [hash(tel)];
  const naam = record.getString("voornaam");
  if (naam) ud.fn = [hash(naam)];
  const fbclid = record.getString("fbclid");
  if (fbclid) ud.fbc = "fb.1." + Date.now() + "." + fbclid;
  const ua = record.getString("user_agent");
  if (ua) ud.client_user_agent = ua;

  const ev = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: paginaUrl(record.getString("bron")),
    user_data: ud,
    custom_data: { content_name: "Quiz gastvrij", content_category: record.getString("profiel") },
  };
  // zelfde id als de pixel krijgt, zodat Meta browser- en servermelding samenvoegt
  if (record.getString("event_id")) ev.event_id = record.getString("event_id");
  return ev;
}

function stuur(env, events, testCode) {
  const body = { data: events };
  if (testCode) body.test_event_code = testCode;
  const res = $http.send({
    method: "POST",
    url: "https://graph.facebook.com/v21.0/" + env.META_PIXEL_ID + "/events?access_token=" + encodeURIComponent(env.META_CAPI_TOKEN),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 10,
  });
  if (res.statusCode !== 200 || !res.json || !res.json.events_received) {
    throw new Error("Meta weigerde: " + res.statusCode + " " + toString(res.body));
  }
  return res.json;
}

function stuurLead(env, record) {
  if (env.META_CAPI_AAN !== "ja") return; // staat uit tot Takecarebnb akkoord is met de privacytekst
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) {
    $app.logger().warn("tcbnb meta", "melding", "tcbnb_meta.env is nog niet compleet, lead niet gemeld", "id", record.id);
    return;
  }
  stuur(env, [bouwEvent(record)], env.META_TEST_CODE);
}

module.exports = { leesEnv, bouwEvent, stuur, stuurLead };
