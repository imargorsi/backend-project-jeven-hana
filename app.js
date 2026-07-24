require("dotenv").config();

var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var { clerkMiddleware } = require("@clerk/express");

// Routes: add a file under routes/, require it here, then app.use("/", thatRouter).
var indexRouter = require("./routes/index");
var demoRouter = require("./routes/demo");
var authRouter = require("./routes/auth");
var usersRouter = require("./routes/users");

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

// Attach Clerk auth state from Bearer token / session cookie (does not block guests).
app.use(clerkMiddleware());

app.use("/", indexRouter);
app.use("/", authRouter);
app.use("/", usersRouter);
app.use("/", demoRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    data: null,
    errors: [{ code: status === 404 ? "not_found" : "server_error" }],
  });
});

module.exports = app;
