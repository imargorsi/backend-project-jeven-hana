/**
 * Lightweight security middleware (no extra deps).
 * Safe defaults for a Clerk-backed mobile API on Vercel.
 */

function applySecurity(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(function securityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    // API responses should not be cached by shared caches by default.
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });
}

/**
 * CORS for browser clients. Native apps send no Origin — always allowed.
 * Set CORS_ORIGINS=https://a.com,https://b.com to restrict browsers.
 * Omit / use * to allow any browser origin (OK for public read APIs).
 */
function createCorsOptions() {
  const raw = process.env.CORS_ORIGINS || "*";
  const list = raw
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  const allowAll = list.length === 0 || list.includes("*");

  return {
    origin: function (origin, callback) {
      if (!origin || allowAll || list.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  };
}

module.exports = { applySecurity, createCorsOptions };
