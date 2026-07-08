# Authentication (Backend)

Two unrelated auth mechanisms coexist in this backend — don't conflate them:

1. **Dashboard admin auth** — JWT, described below.
2. **WhatsApp webhook trust** — no JWT; see [`api/webhook.md`](../api/webhook.md).

## Dashboard auth: JWT

`services/auth.service.js` issues tokens on successful login:

```js
jwt.sign(
  { id, username, email, name, role },
  config.auth.jwtSecret,
  { expiresIn: '7d' }
)
```

The full admin identity (including `role`) is embedded in the token payload — `req.user` is populated straight from the decoded JWT in `auth.middleware.js`, with no per-request DB lookup. This means a role change (`PATCH /api/admins/:id`) does not take effect for that admin until they log in again with a fresh token.

`config.auth.jwtSecret` falls back to a hardcoded development string if `JWT_SECRET` is unset — this is only acceptable locally; production **must** set `JWT_SECRET` (see [`setup/environment.md`](../setup/environment.md)).

## Middleware

- **`middlewares/auth.middleware.js`** — reads `Authorization: Bearer <token>`, verifies it with `jwt.verify`, attaches the decoded payload to `req.user`, or responds `401`. Applied per-route (`router.use(authMiddleware)`), not globally — public routes like `/api/auth/login`, `/api/auth/google`, and the whole `/api/webhook` group skip it entirely.
- **`middlewares/role.middleware.js`** — `requireRole(...allowedRoles)` returns a middleware checking `req.user.role` against the allow-list, responding `403` otherwise. Always chained *after* `authMiddleware` so `req.user` exists.

## Roles

| Role | Can read | Can write (farmers/goats/recordings/follow-ups) | Can manage admins |
|---|---|---|---|
| `VIEWER` | ✅ | ❌ | ❌ |
| `ADMIN` | ✅ | ✅ | ❌ |
| `SUPERADMIN` | ✅ | ✅ | ✅ |

See each file under [`../api/`](../api/) for the exact role requirement per endpoint.

## Password auth

`bcryptjs` with 10 salt rounds (`hashPassword`/`comparePassword` in `auth.service.js`). `Admin.password` is nullable — accounts created purely via Google linkage may have none, in which case `POST /api/auth/login` always returns `401` for that email (checked via `!admin.password`).

## Google Sign-In

`POST /api/auth/google` verifies the client-supplied ID token server-side using `google-auth-library`'s `OAuth2Client.verifyIdToken()` against `GOOGLE_CLIENT_ID` — never trusts a client-asserted identity without this verification. New admins are never created through this flow; the Google `sub` (as `googleId`) is only linked to an *existing* admin found by email. This is intentional: account provisioning is a `SUPERADMIN`-only action via [`POST /api/admins`](../api/admins.md#post-apiadmins), Google Sign-In is just an alternate login method for an already-provisioned account. See [ADR-002](../decisions/adr-002-jwt-plus-google-oauth.md).
