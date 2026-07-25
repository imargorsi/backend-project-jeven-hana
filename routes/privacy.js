// Public HTML Privacy Policy for Google Play Console (HTTPS URL).
// Keep wording aligned with mobile lib/content/privacy.content.ts.
var express = require("express");
var router = express.Router();

var LAST_UPDATED = "July 20, 2026";

var SECTIONS = [
  {
    heading: "Information we collect",
    body: "Account details you provide when signing up (such as name, email, and profile photo), content you create (business listings, community posts, events, and reviews), and basic technical data needed to run the app (device and app version information related to crashes and reliability).",
  },
  {
    heading: "How we use information",
    body: "We use your information to operate the app, show community content, enable search and favorites, notify you about relevant activity, improve reliability, and keep the community safe (for example, moderating abuse).",
  },
  {
    heading: "Authentication and third parties",
    body: "Sign-in is powered by Clerk. Uploaded images may be stored with our cloud storage provider. Hosting and delivery may use our API host (currently Vercel) and related infrastructure. Those providers process data only as needed to provide their services.",
  },
  {
    heading: "Sharing",
    body: "We do not sell your personal information. Content you post in public areas of the app (such as listings, posts, or events) is visible to other users. We may share information if required by law or to protect the safety of the community.",
  },
  {
    heading: "Data retention and deletion",
    body: "We keep account and content data while your account is active and as needed to operate the service. You can edit or remove much of your content in the app. To request account deletion or help with data removal, contact us using the details on the About screen inside the Jevan Hana app.",
  },
  {
    heading: "Children",
    body: "Jevan Hana is intended for general community use. If you believe a child has provided personal information inappropriately, contact us and we will take reasonable steps to address it.",
  },
  {
    heading: "Changes",
    body: "We may update this policy from time to time. The “Last updated” date at the top will change when we do. Continued use of the app after updates means you accept the revised policy.",
  },
  {
    heading: "Contact",
    body: "Questions about privacy: use WhatsApp or the contact options on the About screen inside the Jevan Hana app.",
  },
];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

router.get("/privacy", function (req, res) {
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
    "  <title>Jevan Hana — Privacy Policy</title>\n" +
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
    "  <h1>Privacy Policy</h1>\n" +
    '  <p class="meta">Last updated: ' +
    escapeHtml(LAST_UPDATED) +
    "</p>\n" +
    "  <p>Jevan Hana (“we”, “us”) is a community app for residents of Jevan Hana, Garden Town, Lahore. This policy explains what information we collect, how we use it, and your choices.</p>\n" +
    sectionsHtml +
    "\n</body>\n</html>\n";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
});

module.exports = router;
