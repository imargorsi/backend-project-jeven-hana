# Jevan Hana — API Agents

Expert **Node / Express** engineer for `backend-project-jeven-hana/`.

**Product scope & planning:** `../AGENTS.md` and `../doc/modules/` (especially `scope.md`).  
Do not redefine v1/v2 product rules here — follow the root docs.

---

## Stack

- Node.js + Express (CommonJS today — match the kit; TS only if requested)
- Sequelize + **`pg`** → **Neon Postgres** (`DATABASE_URL`)
- **Clerk** via `@clerk/express` (same Clerk app as mobile)
- `dotenv`, `cors`, `morgan`, `cookie-parser`
- Pattern: `routes/` → `service/` → `models/definitions/`

Ask before installing new major libraries.

---

## Layout

```text
app.js                 # Express app, clerkMiddleware, routers
bin/www                # HTTP server + sequelize.sync
bin/dbConnection.js    # Neon Sequelize instance
config/config.json     # Dialect notes (env-driven)
models/
  index.js             # Registry → { db }
  definitions/         # User, DemoItem, …
middleware/            # requireAuth, requireAdmin, attachLocalUser
routes/                # auth, users, demo, …
service/               # userService, demoService, …
utils/apiResponse.js   # success / fail envelope
.env                   # secrets (gitignored)
.env.example
```

---

## Database

- **Neon Postgres** only for deployed / shared work (no SQLite on Vercel)
- Connection: `bin/dbConnection.js` + `DATABASE_URL` (SSL)
- Dev sync: `sync({ alter: true })` in `bin/www` — prefer migrations before production
- Local `.env` never committed

---

## Auth (API)

- Verify Clerk session JWT (`Authorization: Bearer …`)
- `clerkMiddleware()` global (does not block guests)
- `requireAuth` → JSON **401** (never redirect — mobile API)
- `attachLocalUser` → upsert Neon `Users` from Clerk
- `requireAdmin` → local `Users.role === "admin"`
- Role source: Clerk `publicMetadata.role` (`admin` \| default `user`)
- Secret + publishable keys on server only

### Ready routes

| Method | Path | Access |
| ------ | ---- | ------ |
| POST | `/api/v1/auth/sync` | Signed-in |
| GET | `/api/v1/auth/me` | Signed-in (sync + profile) |
| GET | `/api/v1/users/me` | Signed-in (same user resource) |
| GET | `/api/v1/auth/ping` | Signed-in |
| GET | `/api/v1/auth/admin-ping` | Admin |

### Making an admin

Clerk Dashboard → User → **Public metadata**:

```json
{ "role": "admin" }
```

Then `GET /api/v1/auth/me` (or `/sync`) so Neon updates.

---

## Response envelope

Use `utils/apiResponse.js`:

```json
{
  "success": true,
  "message": "…",
  "data": {},
  "errors": []
}
```

Target prefix for new modules: `/api/v1/...`  
Public browse vs signed-in vs admin: match `../doc/modules/scope.md`.

---

## Adding a domain module

1. `models/definitions/{entity}.js` → register in `models/index.js`
2. `service/{entity}Service.js` — business rules here
3. `routes/{entity}.js` — thin handlers + `requireAuth` / `requireAdmin` as needed
4. Mount in `app.js`
5. Document endpoints in `../doc/modules/{feature}.md` when behavior is set

Keep route handlers thin. Ownership: users mutate **own** rows; admin can delete any.

Ka Best = `isKaBest` boolean on business/place — admin toggle only.

---

## Env

```env
DATABASE_URL=postgresql://…?sslmode=require&uselibpqcompat=true
PORT=3000
CLERK_PUBLISHABLE_KEY=pk_…
CLERK_SECRET_KEY=sk_…
```

See `.env.example`.

---

## Scripts

```bash
npm install
cp .env.example .env   # fill Neon + Clerk
npm start              # or npm run dev (nodemon)
```

Sanity: `GET /` · `GET /api/health`

---

## When building

1. Read `../AGENTS.md` + `../doc/modules/{feature}.md`
2. Follow **this** file for API patterns
3. One module at a time; secure mutations with Clerk middleware
4. Prefer readable code; no parallel JWT auth system
