/// <reference path="../pb_data/types.d.ts" />
// Mailt Takecarebnb bij elke nieuwe aanvraag via het campagneformulier (tcbnb_info_aanvragen, info/index.html).
// Antwoorden op de mail gaat rechtstreeks naar de aanvrager (reply-to), Victor krijgt een bcc.
// Mailt via de TransIP-relay met de gegevens uit /opt/pocketbase/mail.env (zelfde als showcase en afspraak-tool).
// Lukt de mail niet, dan blijft de aanvraag gewoon in PocketBase staan en komt de fout in de logs.

onRecordAfterCreateSuccess((e) => {
  e.next();
  const r = e.record;
  const NAAR = "info@takecarebnb.org";
  const BCC = "victor@veen.co";
  const esc = (t) => String(t || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  try {
    const env = {};
    toString($os.readFile(__hooks + "/../mail.env")).split("\n").forEach((regel) => {
      const i = regel.indexOf("=");
      if (i > 0 && regel[0] !== "#") env[regel.slice(0, i).trim()] = regel.slice(i + 1).trim();
    });
    // SMTP alleen in het geheugen: wachtwoord blijft uit de database
    const s = $app.settings();
    s.smtp.enabled = true;
    s.smtp.host = env.MAIL_HOST;
    s.smtp.port = parseInt(env.MAIL_PORT, 10);
    s.smtp.tls = false; // poort 587: STARTTLS
    s.smtp.username = env.MAIL_USER;
    s.smtp.password = env.MAIL_PASS;

    const bellen = r.getString("route") === "bellen";
    const naam = r.getString("voornaam");
    const email = r.getString("email");
    const tel = r.getString("telefoon");
    const dagdeel = r.getString("dagdeel");
    const rij = (label, waarde) => waarde
      ? '<tr><td style="padding:6px 16px 6px 0;color:#5f7f7d;vertical-align:top">' + label + '</td><td style="padding:6px 0"><b>' + waarde + "</b></td></tr>"
      : "";

    // Test: vult Victor het formulier in met zijn eigen adres, dan gaat de mail alleen naar hem
    const test = email.toLowerCase() === BCC;

    $app.newMailClient().send(new MailerMessage({
      from: { address: env.MAIL_FROM || "formulier@vdveen.online", name: "Takecarebnb campagneformulier" },
      replyTo: [{ address: email, name: naam }],
      to: [test ? { address: BCC } : { address: NAAR, name: "Takecarebnb" }],
      bcc: test ? [] : [{ address: BCC }],
      subject: (test ? "[TEST] " : "") + (bellen ? "Belverzoek: " : "Folder aangevraagd: ") + naam,
      html:
        '<div style="font-family:Arial,sans-serif;color:#004542;max-width:560px">' +
        '<p style="font-size:22px;font-weight:800;margin:0 0 6px">' +
        (bellen ? esc(naam) + " wil graag gebeld worden" : esc(naam) + " wil de informatiefolder") + "</p>" +
        '<p style="margin:0 0 16px;color:#5f7f7d">Via het campagneformulier voor gastgezinnen.</p>' +
        '<table style="border-collapse:collapse;font-size:15px">' +
        rij("Voornaam", esc(naam)) +
        rij("E-mail", '<a href="mailto:' + esc(email) + '" style="color:#004542">' + esc(email) + "</a>") +
        rij("Telefoon", tel ? '<a href="tel:' + esc(tel.replace(/\s/g, "")) + '" style="color:#004542">' + esc(tel) + "</a>" : "") +
        rij("Liefst bellen in de", esc(dagdeel)) +
        rij("Nieuwsbrief", r.getBool("nieuwsbrief") ? "ja, graag" : "nee") +
        "</table>" +
        '<p style="margin:20px 0 0;padding:14px 16px;background:#FFF5E4;border-radius:8px">' +
        (bellen
          ? "Wil je bellen en de folder mailen? Met <b>Beantwoorden</b> mail je " + esc(naam) + " direct."
          : "Stuur de folder: met <b>Beantwoorden</b> mail je " + esc(naam) + " direct.") +
        "</p></div>",
    }));
  } catch (err) {
    $app.logger().error("tcbnb info melding", "id", r.id, "fout", String(err));
  }
}, "tcbnb_info_aanvragen");
