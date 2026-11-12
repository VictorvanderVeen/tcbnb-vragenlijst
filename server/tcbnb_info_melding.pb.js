/// <reference path="../pb_data/types.d.ts" />
// Bij elke nieuwe aanvraag via het campagneformulier (tcbnb_info_aanvragen, info/index.html) gaan er twee mails uit:
//   1. melding aan info@takecarebnb.org (reply-to = aanvrager), Victor krijgt een bcc;
//   2. mail aan de aanvrager met de folder als link, namens Lidwien (reply-to = info@takecarebnb.org).
// Afzender moet @vdveen.online zijn (TransIP-relay); MAIL_FROM_TCBNB in mail.env overschrijft MAIL_FROM.
// Mailt via de TransIP-relay met de gegevens uit /opt/pocketbase/mail.env (zelfde als showcase en afspraak-tool).
// Lukt de mail niet, dan blijft de aanvraag gewoon in PocketBase staan en komt de fout in de logs.

onRecordAfterCreateSuccess((e) => {
  e.next();
  const r = e.record;
  const NAAR = "info@takecarebnb.org";
  const BCC = "victor@veen.co";
  const FOLDER = "https://victorvanderveen.github.io/tcbnb-vragenlijst/info/folder-gastgezin-worden.pdf";
  const INSCHRIJVEN = "https://takecarebnb.org/inschrijven-gastgezinnen/";
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

    // Elke mail apart: mislukt de ene, dan gaat de andere toch
    const stuur = (bericht) => {
      try { $app.newMailClient().send(bericht); }
      catch (err) { $app.logger().error("tcbnb info mail", "id", r.id, "aan", String(bericht.to[0].address), "fout", String(err)); }
    };

    // Test: vult Victor het formulier in met zijn eigen adres, dan gaat de mail alleen naar hem
    const test = email.toLowerCase() === BCC;

    stuur(new MailerMessage({
      from: { address: env.MAIL_FROM || "formulier@vdveen.online", name: "Takecarebnb campagneformulier" },
      replyTo: [{ address: email, name: naam }],
      to: [test ? { address: BCC } : { address: NAAR, name: "Takecarebnb" }],
      bcc: test ? [] : [{ address: BCC }],
      subject: (test ? "[TEST] " : "") + (bellen ? "Belverzoek: " : "Folder aangevraagd: ") + naam,
      html:
        '<div style="font-family:Arial,sans-serif;color:#004542;max-width:560px">' +
        '<p style="font-size:22px;font-weight:800;margin:0 0 6px">' +
        (bellen ? esc(naam) + " wil graag gebeld worden" : esc(naam) + " heeft de informatiefolder aangevraagd") + "</p>" +
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
          ? esc(naam) + " heeft de folder al automatisch gekregen, met de belofte dat Lidwien binnen een paar werkdagen belt."
          : esc(naam) + " heeft de folder al automatisch gekregen. Met <b>Beantwoorden</b> mail je " + esc(naam) + " direct.") +
        "</p></div>",
    }));

    // ── Mail aan de aanvrager: folder als link, ondertekend door Lidwien ──
    // Versie B (bellen) = 'We bellen je snel', versie A (folder) = 'Hier is je folder'.
    const knop = (href, tekst) => '<p style="margin:22px 0"><a href="' + href + '" style="display:inline-block;background:#004542;color:#FFF5E4;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none">' + tekst + "</a></p>";
    const p = (t) => '<p style="margin:0 0 14px">' + t + "</p>";
    const groet = p("Hartelijke groet,<br>Lidwien<br>Takecarebnb");
    const folderKnop = knop(FOLDER, "Bekijk de folder (pdf)");
    const inhoud = bellen
      ? p("Hoi " + esc(naam) + ",") +
        p("Dank je voor je aanvraag. We bellen je binnen een paar werkdagen" + (dagdeel ? ", in de " + esc(dagdeel) + " zoals je aangaf" : "") + ".") +
        p("Alvast lezen? Hier is de folder:") + folderKnop +
        p("Schrijf gerust je vragen op. In het gesprek is er alle ruimte voor: hoeveel tijd het kost, wat het kost, wat als het niet klikt. Niets is een rare vraag.") +
        groet
      : p("Hoi " + esc(naam) + ",") +
        p("Hier is de folder die je aanvroeg:") + folderKnop +
        p("Drie dingen die nieuwe gastgezinnen vaak geruststellen:") +
        '<ul style="margin:0 0 18px;padding-left:20px">' +
        '<li style="margin-bottom:10px"><b>Je zegt bij elke stap ja of nee.</b> Eerst een kennismaking bij jou thuis. Daarna een weekend proeflogeren. Pas als dat goed voelt, worden de koffers gepakt.</li>' +
        '<li style="margin-bottom:10px"><b>Je staat er niet alleen voor.</b> Een matchmaker bij jou in de buurt zoekt een gast die bij je past, en blijft betrokken zolang het logeren duurt.</li>' +
        '<li><b>Niets moet, alles mag.</b> Samen eten of ieder z\'n eigen ritme? Dat spreek je samen af.</li></ul>' +
        p("Klinkt het goed?") + knop(INSCHRIJVEN, "Meld je vrijblijvend aan") +
        p("Liever eerst even praten? Antwoord op deze mail met je telefoonnummer. Dan bellen we je.") +
        groet;

    stuur(new MailerMessage({
      from: { address: env.MAIL_FROM_TCBNB || env.MAIL_FROM || "formulier@vdveen.online", name: "Lidwien van Takecarebnb" },
      replyTo: [{ address: NAAR, name: "Takecarebnb" }],
      to: [{ address: email, name: naam }],
      subject: (test ? "[TEST] " : "") + (bellen ? "We bellen je snel, " : "Hier is je folder, ") + naam,
      html: '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#004542;max-width:560px">' + inhoud + "</div>",
    }));
  } catch (err) {
    $app.logger().error("tcbnb info melding", "id", r.id, "fout", String(err));
  }
}, "tcbnb_info_aanvragen");
