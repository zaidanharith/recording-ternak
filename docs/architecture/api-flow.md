# Request Lifecycle

Two distinct request flows exist: the **WhatsApp webhook flow** (unauthenticated, driven by Meta) and the **dashboard REST API flow** (JWT-authenticated, driven by the Next.js frontend).

## WhatsApp report flow

```mermaid
sequenceDiagram
    participant Farmer as Farmer (WhatsApp)
    participant Meta as WhatsApp Cloud API
    participant Webhook as webhook.controller.js
    participant Recording as recording.service.js
    participant Gemini as gemini.service.js
    participant Session as session.service.js (Postgres)
    participant Repo as farmer/goat/recording repositories
    participant Sheets as sheets.service.js

    Farmer->>Meta: Free-form message
    Meta->>Webhook: POST /api/webhook
    Webhook->>Recording: handleMessage(text, phone, name)
    Recording->>Session: getSession(phone)
    alt no active session
        Recording->>Gemini: parseMessage(text)
        Gemini-->>Recording: structured fields or bukan_laporan_ternak
        Recording->>Session: setSession(awaiting_confirmation | awaiting_nomor_telinga)
    else awaiting_confirmation
        Recording->>Gemini: classifyMessageInConfirmation(text)
        Gemini-->>Recording: REVISI | PEMBATALAN | PERTANYAAN
    end
    Recording->>Meta: sendTextMessage(reply)
    Note over Recording,Sheets: On confirmed "ya":
    Recording->>Repo: findOrCreateFarmer, findOrCreateGoat, createRecording
    Recording->>Sheets: appendRecording + upsertKambing + upsertPeternak
    Recording-->>Webhook: { state }
    Webhook-->>Meta: 200 EVENT_RECEIVED
```

Image messages follow the same path via `handleImageMessage`, which downloads the media from Meta, validates MIME type/size, uploads to Cloudinary, then delegates to `handleMessage` with the caption as the report text (see [`api/webhook.md`](../api/webhook.md)).

## Dashboard REST API flow

```mermaid
sequenceDiagram
    participant Client as Next.js Dashboard
    participant Route as Express Route
    participant AuthMw as auth.middleware.js
    participant RoleMw as role.middleware.js
    participant Controller
    participant Repo as Repository (Prisma)
    participant DB as PostgreSQL

    Client->>Route: HTTP request + Authorization: Bearer <JWT>
    Route->>AuthMw: verify JWT
    alt invalid/missing token
        AuthMw-->>Client: 401
    end
    AuthMw->>RoleMw: req.user attached
    alt role not permitted
        RoleMw-->>Client: 403
    end
    RoleMw->>Controller: next()
    Controller->>Repo: query/mutate
    Repo->>DB: Prisma query
    DB-->>Repo: rows
    Repo-->>Controller: result
    Controller-->>Client: { success, data | message }
```

`GET` list/detail endpoints generally only require `authMiddleware` (any logged-in role, including `VIEWER`); create/update/delete endpoints additionally require `requireRole('ADMIN', 'SUPERADMIN')`. `/api/admins/*` requires `SUPERADMIN`. See each file under [`api/`](../api/) for exact per-endpoint requirements, and [`backend/authentication.md`](../backend/authentication.md) for how the JWT is issued and verified.
