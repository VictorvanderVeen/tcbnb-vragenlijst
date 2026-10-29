// Zoho Campaigns-koppeling voor de Takecarebnb-quiz.
// tcbnb_zoho.env bevat: ZOHO_DC (eu of com), ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
// ZOHO_LISTKEY en optioneel ZOHO_EXTRA_VELDEN=ja (stuurt Profiel en Mag bellen mee; die velden moeten in Zoho bestaan).

function leesEnv() {
  const tekst = toString($os.readFile(__hooks + "/../tcbnb_zoho.env"));
  const env = {};
  tekst.split("\n").forEach((r) => {
    const i = r.indexOf("=");
    if (i > 0 && r[0] !== "#") env[r.slice(0, i).trim()] = r.slice(i + 1).trim();
  });
  return env;
}

// Toegangssleutel van Zoho verloopt na een uur; we bewaren hem in het geheugen tot vlak daarvoor
function toegangssleutel(env) {
  const bewaard = $app.store().get("tcbnb_zoho_token");
  if (bewaard && bewaard.tot > Date.now()) return bewaard.token;

  const res = $http.send({
    method: "POST",
    url: "https://accounts.zoho." + env.ZOHO_DC + "/oauth/v2/token" +
      "?grant_type=refresh_token" +
      "&refresh_token=" + encodeURIComponent(env.ZOHO_REFRESH_TOKEN) +
      "&client_id=" + encodeURIComponent(env.ZOHO_CLIENT_ID) +
      "&client_secret=" + encodeURIComponent(env.ZOHO_CLIENT_SECRET),
    timeout: 15,
  });
  if (res.statusCode !== 200 || !res.json || !res.json.access_token) {
    throw new Error("token vernieuwen mislukt: " + res.statusCode + " " + toString(res.body));
  }
  const token = res.json.access_token;
  $app.store().set("tcbnb_zoho_token", { token, tot: Date.now() + ((res.json.expires_in || 3600) - 300) * 1000 });
  return token;
}

function stuurNaarZoho(env, record) {
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_LISTKEY) {
    $app.logger().warn("tcbnb zoho", "melding", "tcbnb_zoho.env is nog niet compleet, lead niet doorgestuurd", "id", record.id);
    return;
  }
  const contact = {
    "Contact Email": record.getString("email"),
    "First Name": record.getString("voornaam"),
  };
  if (record.getString("telefoon")) contact["Phone"] = record.getString("telefoon");
  if (env.ZOHO_EXTRA_VELDEN === "ja") {
    contact["Profiel"] = record.getString("profiel");
    contact["Mag bellen"] = record.getBool("mag_bellen") ? "ja" : "nee";
  }

  const res = $http.send({
    method: "POST",
    url: "https://campaigns.zoho." + env.ZOHO_DC + "/api/v1.1/json/listsubscribe" +
      "?resfmt=JSON" +
      "&listkey=" + encodeURIComponent(env.ZOHO_LISTKEY) +
      "&source=" + encodeURIComponent("Quiz gastgezin") +
      "&contactinfo=" + encodeURIComponent(JSON.stringify(contact)),
    headers: { "Authorization": "Zoho-oauthtoken " + toegangssleutel(env) },
    timeout: 15,
  });
  // Zoho geeft ook bij fouten soms 200 terug; het echte antwoord staat in status
  if (res.statusCode !== 200 || !res.json || res.json.status !== "success") {
    throw new Error("listsubscribe mislukt: " + res.statusCode + " " + toString(res.body));
  }
  // Staat dubbele opt-in (weer) aan, dan meldt Zoho ook success maar staat het contact nog niet in de lijst
  if (String(res.json.message).indexOf("confirm") !== -1) {
    $app.logger().warn("tcbnb zoho", "melding", "dubbele opt-in staat aan in Zoho, contact wacht op bevestiging", "id", record.id);
  }
}

module.exports = { leesEnv, stuurNaarZoho };
