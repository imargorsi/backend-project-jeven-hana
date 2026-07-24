// Neon Postgres via Sequelize + pg. Models are registered in models/index.js.
require("dotenv").config();

const { Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Missing DATABASE_URL. Copy .env.example to .env and paste your Neon connection string."
  );
}

const logging = process.env.DB_LOGGING === "true" ? console.log : false;

const database = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

database
  .authenticate()
  .then(() => {
    console.log("Postgres connected (Neon)");
  })
  .catch((error) => {
    console.log("Database connection error:", error.message);
  });

module.exports = database;
