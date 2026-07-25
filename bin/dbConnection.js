// Neon Postgres via Sequelize + pg. Models are registered in models/index.js.
require("dotenv").config();

const { Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL;
const logging = process.env.DB_LOGGING === "true" ? console.log : false;
const isServerless = Boolean(process.env.VERCEL);

if (!databaseUrl) {
  // Do not throw at import — that crashes every Vercel invocation before routes run.
  console.error(
    "[db] Missing DATABASE_URL. Set it in Vercel → Project → Settings → Environment Variables (Production + Preview), then redeploy.",
  );
}

const database = new Sequelize(
  databaseUrl ||
    "postgres://vercel:missing@127.0.0.1:5432/missing_database_url",
  {
    dialect: "postgres",
    logging,
    dialectOptions: databaseUrl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
    // Smaller pool on Vercel — prefer Neon’s pooled connection string.
    pool: isServerless
      ? {
          max: 5,
          min: 0,
          idle: 10_000,
          acquire: 20_000,
        }
      : undefined,
  },
);

if (databaseUrl) {
  database
    .authenticate()
    .then(() => {
      console.log("Postgres connected (Neon)");
    })
    .catch((error) => {
      console.log("Database connection error:", error.message);
    });
}

module.exports = database;
