# Omnichannel Support Bot

A complaint/support chatbot that talks to customers over **WhatsApp** and a **website chat widget**, and also takes complaints through a **website complaint form**, sharing one conversation engine, one customer identity, and one chat history across both. Built with NestJS, Postgres, and Redis, with agent login, a live admin dashboard, human handover, and a pluggable AI hook — architected so a third channel (SMS, Instagram, etc.) can be added without touching the core.

## How it works

1. A customer messages your WhatsApp number, opens the web chat widget on your site, or fills in the complaint form at `/complaint`.
2. On the chat channels they go through a guided complaint flow: description → category → contact preference → confirm. The form collects the same details in one go.
3. Every channel files the complaint through one shared intake service: it's saved to Postgres with the channel it came from, the dashboard updates live, and a notification email fires (via a Redis/BullMQ queue). The complainant is told their complaint was received and passed on, with a reference number (e.g. `7K3Q-9P2M`): in the chat, on screen after the form, and by email if they gave one.
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
  complaints/
    complaint-intake.service.ts  The one place every channel files a complaint (save, notify, live update)
    complaint-options.ts         Fixed category and language lists channels offer
    complaints.controller.ts     Dashboard REST: complaint list
  channels/
    channel.types.ts           ChannelAdapter interface every channel implements
    channel-registry.service.ts
    whatsapp/                  Meta WhatsApp Cloud API webhook + adapter
      simulator/               Test stand-in for WhatsApp (see "Testing the WhatsApp bot")
    web/                       Website chat widget over Socket.io
    web-form/                  Public complaint form API: validation, phone normalization, honeypot, Redis rate limit
  customers/                   Customer + CustomerIdentity, cross-channel link request/confirm
  auth/                        Agent login (JWT), roles guard
  agents/                      Agent management (list/create)
  notifications/               Email notifications via a BullMQ/Redis queue
  ai/                          Pluggable AI provider (Echo by default, Anthropic behind a flag)
  realtime/                    Socket.io gateway that pushes live updates to the dashboard

public/
  dashboard/                   Minimal agent dashboard (login, conversation list, reply, handover)
  widget/                      Standalone demo page for the web chat channel
  complaint/                   Website complaint form (mobile-friendly, light/dark)
  whatsapp-simulator/          Chat with the WhatsApp bot in a browser, no Meta account needed
```

**Adding a channel later**: implement `ChannelAdapter` (`sendMessage`), normalize its inbound events into `IncomingMessage`, call `ConversationEngineService.handleIncoming()`, and register the adapter in `ChannelsModule`. Nothing else changes — the engine, database schema, and dashboard are already channel-agnostic (`channel` is a free-form string, not an enum). A channel that only takes complaints in and never replies (like the website form) can skip the adapter and conversation engine and call `ComplaintIntakeService.submit()` directly.

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
cp .env.example .env        # defaults run a local test environment; change ADMIN_SEED_PASSWORD
docker compose up -d        # starts local Postgres + Redis
npm run prisma:migrate      # creates the schema (use `npm run prisma:deploy` on servers)
npm run seed                # creates the first admin agent from ADMIN_SEED_* env vars
npm run start:dev
```

Open `http://localhost:3000/dashboard` and log in with the seeded admin credentials. Open `http://localhost:3000/whatsapp-simulator` to chat with the WhatsApp bot, `http://localhost:3000/widget` to try the web chat channel, and `http://localhost:3000/complaint` to try the complaint form.

## Testing the WhatsApp bot

There are two ways, and you'll usually want both: the simulator for day-to-day testing, then a real phone before going live.

### 1. The simulator (no Meta account needed)

With `WHATSAPP_SIMULATOR=true` in `.env` (the default in `.env.example`), open `http://localhost:3000/whatsapp-simulator`. It's a chat screen where you play a WhatsApp user:

- Your messages are turned into exactly the webhook payload Meta sends and go through the same code as real WhatsApp messages, so what works here works on WhatsApp.
- The bot's replies, and any agent replies from the dashboard, appear in the simulator instead of being sent to Meta.
- Tap **Test user** to choose the phone number and name you're chatting as, or **New test user** for a fresh random number. Open several tabs to be several customers at once.
- The 🎤 button sends a voice note, to test how the bot handles messages it can't read.
- Keep the dashboard open next to it to watch complaints arrive, take over a conversation, and reply as an agent.

While the simulator is on, **all** outgoing WhatsApp messages go to it, and anyone who can open the page can chat as any phone number. Only turn it on for local or private test servers, never where real customers use the bot.

### 2. Real WhatsApp with Meta's free test number

Meta gives every WhatsApp Cloud API app a free test phone number that can message up to 5 phone numbers you verify, so you can try the bot on your own phone before you have a business number.

1. Create a Meta app with the WhatsApp product and open **WhatsApp → API Setup**: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
2. Under **To**, add and verify your own phone number (up to 5 testers).
3. Copy the **temporary access token** into `WHATSAPP_ACCESS_TOKEN` and the test number's **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID`. The temporary token expires after about 24 hours; for longer testing create a System User token in Meta Business settings.
4. Set `WHATSAPP_SIMULATOR=false`, choose any `WHATSAPP_VERIFY_TOKEN`, and restart the app.
5. Meta needs a public HTTPS address for the webhook. Locally, expose port 3000 with a tunnel, for example `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`.
6. In **WhatsApp → Configuration**, set the Callback URL to `https://<tunnel-address>/webhook/whatsapp` and the Verify token to your `WHATSAPP_VERIFY_TOKEN`, then subscribe to the `messages` field.
7. Message the test number from your verified phone. The conversation appears on the dashboard like any other.

For going live, the steps are the same with your own business phone number and a permanent token, plus the app secret below.

## Configuring WhatsApp

1. Create a Meta app with the WhatsApp product: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
2. Set the webhook **Callback URL** to `https://<your-domain>/webhook/whatsapp` and the **Verify token** to `WHATSAPP_VERIFY_TOKEN`.
3. Subscribe to the `messages` field.
4. Copy the access token into `WHATSAPP_ACCESS_TOKEN`, the phone number ID into `WHATSAPP_PHONE_NUMBER_ID`, and (recommended) the app secret into `WHATSAPP_APP_SECRET` so inbound webhook calls are signature-verified.

## Environment variables

See `.env.example` for the full list with comments — server port/JWT secret, `DATABASE_URL`, Redis host/port, WhatsApp Cloud API credentials and the `WHATSAPP_SIMULATOR` switch, SMTP settings, the AI provider switch, and the seed-admin credentials.

Website complaint form:

- `WEB_FORM_RATE_LIMIT` / `WEB_FORM_RATE_WINDOW_SECONDS` — complaints accepted per IP address per window (default 10 per 600 seconds). Mobile networks often share one IP between many people, so keep it generous.
- `TRUST_PROXY` — set when running behind a load balancer or reverse proxy (e.g. `1` for one hop) so the rate limit sees each visitor's real IP instead of the proxy's.
- `DEFAULT_COUNTRY_CODE` — country code assumed for phone numbers typed without one (default `264`, Namibia).

## API overview

Public (no login), used by the complaint form:

- `GET /public/complaints/options` — the category and language choices the form offers
- `POST /public/complaints` — submit a complaint; returns `{ received: true, reference }`. Needs a phone number or email, and `consent: true`.

Dashboard (all under JWT auth except `/auth/login`):

- `POST /auth/login` — agent login, returns a JWT
- `GET /conversations`, `GET /conversations/:id` — list / thread detail
- `POST /conversations/:id/reply` — send a reply as the logged-in agent
- `POST /conversations/:id/handover` — `{ handoverState: "HUMAN" | "BOT" }`
- `GET /conversations/:id/suggested-reply` — AI-drafted reply for the agent to edit/send
- `GET /complaints` — all logged complaints, from every channel
- `GET /customers`, `POST /customers/:id/link-requests`, `POST /customers/link-requests/confirm` — cross-channel identity linking
- `GET /agents`, `POST /agents` (admin only) — agent management
- The dashboard also connects to the `/agents` Socket.io namespace (JWT in the handshake) for live updates.

## Testing

```bash
npm test
```

Runs the unit tests: the guided complaint state machine, the complaint intake service, the web form's contact handling and phone number normalization. None of them need a database, Redis, or WhatsApp/AI credentials.

## Known limitations / next steps

- **Web form contact details are unverified.** Repeat form submissions from the same phone number or email are grouped under one customer, under a separate `web-form` identity. They're never attached to that number's WhatsApp history, which still requires the verified link-code flow.
- **Chat categories are free text.** The form uses fixed category codes (`src/complaints/complaint-options.ts`), but the WhatsApp/web chat flow still accepts whatever the customer types, so the same category can appear as e.g. `service quality` and `service_quality`. Moving chat to the same fixed list (e.g. WhatsApp buttons) fixes this.
- **The form has no captcha.** It relies on a honeypot field and the per-IP rate limit. Add one (e.g. Cloudflare Turnstile) if spam becomes a problem.

- **Identity merging**: linking a channel identity that's already attached to a *different* customer is rejected rather than merged (would require reassigning conversations/messages/complaints across customers — a real merge tool is a reasonable next addition).
- **Dashboard auth is single-tier beyond roles**: any authenticated agent sees every conversation; there's no per-team routing/assignment queue yet.
- **AI integration** ships with a no-external-calls "echo" provider by default; set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` for real model-drafted replies.
- **Socket.io scaling**: for multiple app instances behind a load balancer, add the Redis Socket.io adapter (`@socket.io/redis-adapter`) so broadcasts reach agents connected to a different instance.
