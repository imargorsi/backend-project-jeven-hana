require("dotenv").config();

var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var { clerkMiddleware } = require("@clerk/express");

var {
  applySecurity,
  createCorsOptions,
} = require("./middleware/security");

// Routes: add a file under routes/, require it here, then app.use("/", thatRouter).
var indexRouter = require("./routes/index");
var privacyRouter = require("./routes/privacy");
var guidelinesRouter = require("./routes/guidelines");
var demoRouter = require("./routes/demo");
var authRouter = require("./routes/auth");
var usersRouter = require("./routes/users");
var eventsRouter = require("./routes/events");
var communityRouter = require("./routes/community");
var businessesRouter = require("./routes/businesses");
var uploadsRouter = require("./routes/uploads");
var reviewsRouter = require("./routes/reviews");
var notificationsRouter = require("./routes/notifications");
var searchRouter = require("./routes/search");
var reportsRouter = require("./routes/reports");

var app = express();

applySecurity(app);

app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(cors(createCorsOptions()));

// Attach Clerk auth state from Bearer token / session cookie (does not block guests).
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
} else {
  console.warn(
    "[auth] CLERK_SECRET_KEY is missing — protected routes will return 401 until it is set on Vercel.",
  );
}

app.use("/", indexRouter);
app.use("/", privacyRouter);
app.use("/", guidelinesRouter);
app.use("/", authRouter);
app.use("/", usersRouter);
app.use("/", eventsRouter);
app.use("/", communityRouter);
app.use("/", businessesRouter);
app.use("/", uploadsRouter);
app.use("/", reviewsRouter);
app.use("/", notificationsRouter);
app.use("/", searchRouter);
app.use("/", reportsRouter);

// Demo CRUD is for local/dev kits — keep it off production by default.
var enableDemo =
  process.env.ENABLE_DEMO_ROUTES === "true" ||
  process.env.NODE_ENV !== "production";
if (enableDemo) {
  app.use("/", demoRouter);
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler — never leak stacks to clients
app.use(function (err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error("[api]", err);
  }
  const clientMessage =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(status).json({
    success: false,
    message: clientMessage,
    data: null,
    errors: [{ code: status === 404 ? "not_found" : "server_error" }],
  });
});

module.exports = app;
