// Starter routes. For more URLs, either add handlers here or create routes/feature.js
// and mount it in app.js — see readme.md "Add a new route".
var express = require("express");
var router = express.Router();

router.get("/", function (req, res) {
  res.json({ ok: true, message: "API" });
});

router.get("/api/health", function (req, res) {
  var payload = {
    ok: true,
    status: "healthy",
  };

  // Config flags only when explicitly enabled (ops) or outside production.
  var showEnv =
    process.env.HEALTH_DETAIL === "true" ||
    process.env.NODE_ENV !== "production";

  if (showEnv) {
    payload.env = {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasClerkSecret: Boolean(process.env.CLERK_SECRET_KEY),
      hasClerkPublishable: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
      hasR2: Boolean(
        process.env.R2_ACCOUNT_ID &&
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_SECRET_ACCESS_KEY &&
          process.env.R2_BUCKET_NAME,
      ),
      vercel: Boolean(process.env.VERCEL),
    };
  }

  res.json(payload);
});

module.exports = router;
