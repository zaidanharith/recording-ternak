# Webhook API

Base path: `/api/webhook`. Called only by Meta's WhatsApp Cloud API — not authenticated with a JWT (Meta has no way to send one); trust is instead established via `WA_VERIFY_TOKEN` at subscription time and the app-secret-signed URL Meta calls. See [`external-api-integration`] conventions for the Meta-side portal setup and [`api-flow.md`](../architecture/api-flow.md#whatsapp-report-flow) for the sequence diagram.

## `GET /api/webhook`

Meta's webhook verification handshake, called once when you save the callback URL in Meta's dashboard.

Query params: `hub.mode`, `hub.verify_token`, `hub.challenge`.

Behavior: if `hub.mode === "subscribe"` and `hub.verify_token === WA_VERIFY_TOKEN`, responds `200` with the raw `hub.challenge` string. Otherwise `403`. Missing params → `400`.

## `POST /api/webhook`

Receives all WhatsApp events (messages, delivery receipts, etc). Always responds `200 EVENT_RECEIVED` to acknowledge receipt to Meta (per Meta's requirements) except when `body.object !== "whatsapp_business_account"` (`404`) or an unhandled exception occurs (`500`).

Only `messages[0]` from the first `entry[0].changes[0].value` is processed; other event types (status updates) are silently acknowledged with no side effects.

Message type dispatch:

| `message.type` | Handler | Behavior |
|---|---|---|
| `text` | `handleMessage` | Full AI parsing / confirmation flow, see [system-design.md](../architecture/system-design.md#conversation-state-machine) |
| `image` | `handleImageMessage` | Downloads media from Meta, uploads to Cloudinary, treats the caption (if any) as the report text |
| anything else (`sticker`, `video`, `audio`, `document`, `location`, `contacts`, ...) | `handleUnsupportedMessage` | Sends a canned "I can only read text" reply in Indonesian |

No response body is meaningful to the caller beyond the `200`/`4xx`/`500` status — WhatsApp only inspects the HTTP status code.
