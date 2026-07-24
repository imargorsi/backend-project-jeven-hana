# Backend starter kit (AR GORSI)

Small **Express** API with **Sequelize** and **SQLite**, aimed at getting productive quickly if you usually work on the frontend.

## Quick start

```bash
npm install
npm start
```

- Default URL: `http://localhost:3000` (override with env var `PORT`).
- Sanity checks: `GET /` and `GET /api/health` return JSON.

The server only starts listening **after** the database connects and Sequelize runs `sync({ alter: true })` (see `bin/www`). That keeps your SQLite schema roughly in line with your models in development.

## Where things live

| What | Where |
|------|--------|
| Express app (middleware, route mounting) | `app.js` |
| HTTP server + DB sync + port | `bin/www` |
| DB connection (SQLite file path, Sequelize instance) | `bin/dbConnection.js` |
| Sequelize config (storage path, logging) | `config/config.json` |
| Models registry (export `db` for routes) | `models/index.js` |
| HTTP routes | `routes/` (e.g. `routes/index.js`) |
| SQLite database file | `data/database.sqlite` (created on first run) |

## Connect / change the database

- Connection is built in `bin/dbConnection.js` using `config/config.json` → `development.storage` (default: `data/database.sqlite`).
- To use another file, change `storage` to a relative path from the project root or an absolute path.

## Add a new route

1. **Option A — same file:** Add `router.get/post/...` handlers in `routes/index.js`.
2. **Option B — new file:** Create `routes/menus.js` (for example), export an `express.Router()`, then in `app.js`:
   - `var menusRouter = require("./routes/menus");`
   - `app.use("/", menusRouter);`  
   (or `app.use("/api/menus", menusRouter)` if you want all routes in that file under `/api/menus`).

The app already uses `express.json()` and `cors()`, so your frontend can send `Content-Type: application/json` bodies.

## Define a new Sequelize model

1. Add a definition file, e.g. `models/definitions/meal.js`, that exports a function `(sequelize) =>` your model (using `sequelize.define(...)` or `class extends Model` — follow [Sequelize v6 models](https://sequelize.org/docs/v6/core-concepts/model-basics/) if you need the exact API).
2. In `models/index.js`, require that file, call it with `sequelize`, and add the model to the `db` object you export (see the commented example at the top of `models/index.js`).
3. In a route: `const { db } = require("../models");` then e.g. `await db.Meal.findAll()`.

After a restart, `sync({ alter: true })` in `bin/www` will try to align tables with your models (fine for local dev; for production, teams often use **migrations** instead of `alter: true`).

## When you add auth or stricter validation

The minimal kit does not ship **bcrypt**, **joi**, or **jsonwebtoken** — nothing in the repo imports them yet. When you build login/sign-up or need request validation, add what you need, for example:

```bash
npm install bcrypt joi jsonwebtoken
```

Use a strong JWT secret (environment variable in production, not committed).

## Demo API

A full working demo route is available at `/api/demo`.

- `GET /api/demo` list items
- `GET /api/demo/:id` get single item
- `POST /api/demo` create item (JSON: `name`, `description`, `isActive`)
- `PUT /api/demo/:id` update item
- `DELETE /api/demo/:id` remove item

Example payload for POST/PUT:

```json
{ "name": "Demo 1", "description": "sample", "isActive": true }
```

## Dev tip

Auto-restart on file changes (requires `devDependencies` installed via `npm install`):

```bash
npm run dev
```

---

Think of the flow as: **`bin/www`** starts the process → **`bin/dbConnection.js`** connects SQLite → **`models/index.js`** ties models to that connection → **`app.js`** wires Express and **`routes/`** handles HTTP.
