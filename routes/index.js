// Starter routes. For more URLs, either add handlers here or create routes/feature.js
// and mount it in app.js — see readme.md "Add a new route".
var express = require("express");
var router = express.Router();

router.get("/", function (req, res) {
  res.json({ ok: true, message: "API" });
});

router.get("/api/health", function (req, res) {
  res.json({ ok: true, status: "healthy" });
});

module.exports = router;
