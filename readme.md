# Backend — Jevan Hana API

Express + Sequelize + **Neon Postgres** + **Clerk** for the Jevan Hana community app.

**Product scope:** `../AGENTS.md` + `../doc/modules/`  
**Stack rules for agents:** `AGENTS.md` (this folder)

## Quick start

```bash
npm install
cp .env.example .env
# Paste your Neon connection string into DATABASE_URL in .env
npm start
```

- Default URL: `http://localhost:3001` (override with env var `PORT`).
- Sanity checks: `GET /` and `GET /api/health` return JSON.

The server only starts listening **after** the database connects and Sequelize runs `sync({ alter: true })` (see `bin/www`). That keeps your schema roughly in line with your models in development. Prefer migrations before production.

## Where things live

| What | Where |
|------|--------|
| Express app (middleware, route mounting) | `app.js` |
| HTTP server + DB sync + port | `bin/www` |
| DB connection (Neon / `DATABASE_URL`) | `bin/dbConnection.js` |
| Sequelize config notes | `config/config.json` |
| Models registry (export `db` for routes) | `models/index.js` |
| Auth middleware | `middleware/requireAuth.js`, `requireAdmin.js`, `attachLocalUser.js` |
| User sync service | `service/userService.js` |
| HTTP routes | `routes/` (e.g. `routes/auth.js`, `routes/demo.js`) |
| Env secrets | `.env` (gitignored) — see `.env.example` |

## Connect / change the database

- Uses **Neon Postgres** via `DATABASE_URL` in `.env` (loaded by `dotenv`).
- Connection is built in `bin/dbConnection.js` with SSL required for Neon.
- Get a connection string from the [Neon Console](https://console.neon.tech) → your project → Connection details.

## Clerk auth (same app as mobile)

Auth is **Clerk only** — same Clerk application as `project-jeven-hana`.

1. Put keys in `.env` (from Clerk Dashboard → API Keys):

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

2. Mobile sends `Authorization: Bearer <session_token>` (see `lib/api.client.ts`).
3. API verifies with `@clerk/express` (`clerkMiddleware` + `requireAuth`).

| Method | Path | Access |
| ------ | ---- | ------ |
| POST | `/api/v1/auth/sync` | Signed-in — upsert local `Users` row from Clerk |
| GET | `/api/v1/auth/me` | Signed-in — local profile + role (also syncs) |
| GET | `/api/v1/users/me` | Signed-in — same as `/auth/me` (user resource) |
| GET | `/api/v1/auth/ping` | Signed-in — token check |
| GET | `/api/v1/auth/admin-ping` | Admin only |

**Admin role:** in Clerk Dashboard → Users → user → Public metadata:

```json
{ "role": "admin" }
```

Then call `POST /api/v1/auth/sync` (or `/me`) so the local `Users.role` updates.

**Do not** put `CLERK_SECRET_KEY` in the Expo app — server only.

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

## Demo API

A full working demo route is available at `/api/demo`.

- `GET /api/demo` list items — **public**
- `GET /api/demo/:id` get single item — **public**
- `POST /api/demo` create item — **signed-in**
- `PUT /api/demo/:id` update item — **signed-in**
- `DELETE /api/demo/:id` remove item — **signed-in**

Example payload for POST/PUT:

```json
{ "name": "Demo 1", "description": "sample", "isActive": true }
```

## Dev tip

Auto-restart on file changes (requires `devDependencies` installed via `npm install`):

```bash
npm run dev
```

## Deploy to Vercel

Vercel detects Express from `app.js` (`module.exports = app`). Local `npm start` still uses `bin/www` (listen + `sync({ alter: true })`). On Vercel, **`bin/www` is not used** — schema sync does not run on deploy.

### 1. Push `main` and import the repo

1. Push this backend repo to GitHub (or GitLab / Bitbucket).
2. [vercel.com/new](https://vercel.com/new) → import the backend repo.
3. Root directory = repo root (where `app.js` and `package.json` live).
4. Leave Build / Output empty — Express needs no build step.
5. Deploy.

`vercel.json` sets a 30s function limit for slower Neon queries.

### 2. Environment variables (Project → Settings → Environment Variables)

Copy from `.env.example` into **Production** (and Preview if you want):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Prefer Neon **pooled** connection string for serverless |
| `CLERK_PUBLISHABLE_KEY` | Same Clerk app as mobile |
| `CLERK_SECRET_KEY` | Server only |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | |
| `R2_SECRET_ACCESS_KEY` | |
| `R2_BUCKET_NAME` | |
| `R2_PUBLIC_BASE_URL` | e.g. `https://pub-….r2.dev` (no trailing slash) |

`PORT` is optional on Vercel (platform sets it).

### 3. After deploy

1. Open `https://YOUR_PROJECT.vercel.app/` or `/api/health`.
2. Point the Expo app `EXPO_PUBLIC_API_URL` at that origin (no trailing slash).
3. In Clerk Dashboard, allow your Vercel domain if you use any Clerk redirect / authorized origins for this API.

### Schema note

Run schema updates locally (`npm start` → `sync({ alter: true })`) or use migrations **before** relying on new columns in production. Do not depend on Vercel cold starts to alter tables.

---

Think of the flow as: **`bin/www`** starts the process → **`bin/dbConnection.js`** connects Neon Postgres → **`models/index.js`** ties models to that connection → **`app.js`** wires Express and **`routes/`** handles HTTP.
