# Omnichannel Support Bot

A complaint/support chatbot that talks to customers over **WhatsApp** and a **website chat widget**, sharing one conversation engine, one customer identity, and one chat history across both. Built with NestJS, Postgres, and Redis, with agent login, a live admin dashboard, human handover, and a pluggable AI hook — architected so a third channel (SMS, Instagram, etc.) can be added without touching the core.

## How it works

1. A customer messages your WhatsApp number, or opens the web chat widget on your site.
2. Either way, they land in the same guided complaint flow: description → category → contact preference → confirm.
3. On confirmation the complaint is saved to Postgres and a notification email fires (via a Redis/BullMQ queue).
4. At any point the customer can type "agent" (or "human") to hand the conversation to a person; agents see it live on the dashboard and can take over, reply, or hand it back to the bot.
5. If the same person later shows up on a different channel, a short-lived link code attaches the new channel identity to their existing customer record, so their history carries over.

## Architecture

```
src/
  main.ts                    Bootstrap
  app.module.ts               Wires every feature module together

  prisma/                     Postgres access (Prisma ORM)
  conversations/
    conversation-flow.ts       Pure state machine for the guided complaint flow (fully unit tested)
    conversation-engine.service.ts   Channel-agnostic core: identity, history, handover, complaints
    conversations.controller.ts      Dashboard REST: list/detail, reply, handover, AI-suggested reply
    complaints.controller.ts
  channels/
    channel.types.ts           ChannelAdapter interface every channel implements
    channel-registry.service.ts
    whatsapp/                  Meta WhatsApp Cloud API webhook + adapter
    web/                       Website chat widget over Socket.io
  customers/                   Customer + CustomerIdentity, cross-channel link request/confirm
  auth/                        Agent login (JWT), roles guard
  agents/                      Agent management (list/create)
  notifications/               Email notifications via a BullMQ/Redis queue
  ai/                          Pluggable AI provider (Echo by default, Anthropic behind a flag)
  realtime/                    Socket.io gateway that pushes live updates to the dashboard

public/
  dashboard/                   Minimal agent dashboard (login, conversation list, reply, handover)
  widget/                      Standalone demo page for the web chat channel
```

**Adding a channel later**: implement `ChannelAdapter` (`sendMessage`), normalize its inbound events into `IncomingMessage`, call `ConversationEngineService.handleIncoming()`, and register the adapter in `ChannelsModule`. Nothing else changes — the engine, database schema, and dashboard are already channel-agnostic (`channel` is a free-form string, not an enum).

## What's here vs. what you still need to provision

This is a working foundation you can run end-to-end locally today (verified: full WhatsApp + web chat complaint flow, handover, agent reply, AI-suggested reply, and cross-channel identity linking, all against a real local Postgres + Redis). To run it for real you still need to provide:

- A Meta WhatsApp Business Cloud API app (phone number, access token, app secret)
- A Postgres instance and Redis instance reachable from wherever you deploy it
- An SMTP account for outgoing email
- (Optional) An Anthropic API key if you want real AI-generated suggested replies instead of the built-in echo provider

## Requirements

- Node.js 18+
- Postgres 14+ and Redis 6+ (a `docker-compose.yml` is included for local dev)

## Setup

```bash
npm install
cp .env.example .env        # fill in the values, see below
docker compose up -d        # starts local Postgres + Redis
npm run prisma:migrate      # creates the schema
npm run seed                # creates the first admin agent from ADMIN_SEED_* env vars
npm run start:dev
```

Open `http://localhost:3000/dashboard` and log in with the seeded admin credentials. Open `http://localhost:3000/widget` in another tab to try the web chat channel.

## Configuring WhatsApp

1. Create a Meta app with the WhatsApp product: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
2. Set the webhook **Callback URL** to `https://<your-domain>/webhook/whatsapp` and the **Verify token** to `WHATSAPP_VERIFY_TOKEN`.
3. Subscribe to the `messages` field.
4. Copy the access token into `WHATSAPP_ACCESS_TOKEN`, the phone number ID into `WHATSAPP_PHONE_NUMBER_ID`, and (recommended) the app secret into `WHATSAPP_APP_SECRET` so inbound webhook calls are signature-verified.

## Environment variables

See `.env.example` for the full list with comments — server port/JWT secret, `DATABASE_URL`, Redis host/port, WhatsApp Cloud API credentials, SMTP settings, the AI provider switch, and the seed-admin credentials.

## API overview (dashboard, all under JWT auth except `/auth/login`)

- `POST /auth/login` — agent login, returns a JWT
- `GET /conversations`, `GET /conversations/:id` — list / thread detail
- `POST /conversations/:id/reply` — send a reply as the logged-in agent
- `POST /conversations/:id/handover` — `{ handoverState: "HUMAN" | "BOT" }`
- `GET /conversations/:id/suggested-reply` — AI-drafted reply for the agent to edit/send
- `GET /complaints` — all logged complaints
- `GET /customers`, `POST /customers/:id/link-requests`, `POST /customers/link-requests/confirm` — cross-channel identity linking
- `GET /agents`, `POST /agents` (admin only) — agent management
- The dashboard also connects to the `/agents` Socket.io namespace (JWT in the handshake) for live updates.

## Testing

```bash
npm test
```

Runs the conversation-flow unit tests — the guided complaint state machine is pure and channel-agnostic, so it's tested with no database, Redis, or WhatsApp/AI credentials involved.

## Known limitations / next steps

- **Identity merging**: linking a channel identity that's already attached to a *different* customer is rejected rather than merged (would require reassigning conversations/messages/complaints across customers — a real merge tool is a reasonable next addition).
- **Dashboard auth is single-tier beyond roles**: any authenticated agent sees every conversation; there's no per-team routing/assignment queue yet.
- **AI integration** ships with a no-external-calls "echo" provider by default; set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` for real model-drafted replies.
- **Socket.io scaling**: for multiple app instances behind a load balancer, add the Redis Socket.io adapter (`@socket.io/redis-adapter`) so broadcasts reach agents connected to a different instance.
