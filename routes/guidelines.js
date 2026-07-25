// Public HTML Community Guidelines for Google Play (UGC / standards URL).
// Keep wording aligned with mobile lib/content/guidelines.content.ts.
var express = require("express");
var router = express.Router();

var LAST_UPDATED = "July 25, 2026";
var CONTACT_EMAIL = "hey@argorsi.com";
var CONTACT_WHATSAPP = "+923094713379";

var SECTIONS = [
  {
    heading: "Be respectful",
    body: "Treat neighbours with respect. No hate speech, harassment, threats, bullying, or personal attacks.",
  },
  {
    heading: "Keep it local and useful",
    body: "Listings, posts, and events should relate to Jevan Hana / Garden Town life. Prefer clear, honest information that helps residents.",
  },
  {
    heading: "Be truthful",
    body: "Do not post fake businesses, misleading offers, or stolen content. Use your real contact details when listing a business.",
  },
  {
    heading: "No spam or scams",
    body: "No repeated promotional spam, phishing, fraud, or unrelated advertising floods.",
  },
  {
    heading: "Illegal or unsafe content",
    body: "Do not share illegal content, violence, exploitation, or anything that endangers others. We will remove it and may remove accounts.",
  },
  {
    heading: "Photos and privacy",
    body: "Only upload photos you have the right to use. Do not post private information about others without permission.",
  },
  {
    heading: "Reporting and moderation",
    body: "Use Report on posts, listings, and events if something breaks these rules. Admins may edit or remove content and take action on accounts. For urgent help, email or WhatsApp support.",
  },
  {
    heading: "Contact",
    body:
      "Questions or appeals: email " +
      CONTACT_EMAIL +
      " or WhatsApp " +
      CONTACT_WHATSAPP +
      ".",
  },
];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

router.get("/guidelines", function (req, res) {
  var sectionsHtml = SECTIONS.map(function (section) {
    return (
      "<section>" +
      "<h2>" +
      escapeHtml(section.heading) +
      "</h2>" +
      "<p>" +
      escapeHtml(section.body) +
      "</p>" +
      "</section>"
    );
  }).join("\n");

  var html =
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '  <meta charset="utf-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    "  <title>Jevan Hana — Community Guidelines</title>\n" +
    "  <style>\n" +
    "    :root { color-scheme: light dark; }\n" +
    "    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; max-width: 42rem; margin: 0 auto; padding: 1.5rem; }\n" +
    "    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }\n" +
    "    .meta { color: #666; margin-bottom: 1.5rem; }\n" +
    "    h2 { font-size: 1.15rem; margin-top: 1.75rem; }\n" +
    "    p { margin: 0.5rem 0 0; }\n" +
    "  </style>\n" +
    "</head>\n" +
    "<body>\n" +
    "  <h1>Community Guidelines</h1>\n" +
    '  <p class="meta">Last updated: ' +
    escapeHtml(LAST_UPDATED) +
    "</p>\n" +
    "  <p>Jevan Hana is a neighbourhood app for residents of Jevan Hana, Garden Town, Lahore. These guidelines help keep the community useful, respectful, and safe.</p>\n" +
    sectionsHtml +
    "\n</body>\n</html>\n";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
});

module.exports = router;
