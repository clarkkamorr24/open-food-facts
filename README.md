# Food Product Search

A full-stack application for searching packaged food products from
[Open Food Facts](https://world.openfoodfacts.org/), with detailed nutrition
information gated behind a Stripe subscription.

```
food-product-frontend/   Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui
food-product-backend/    Express 5 · TypeScript · Prisma 7 · MySQL · Stripe
docker-compose.yml       MySQL 8.4 for local development
```

---

## Project overview

The demo user can:

- Search packaged foods by product name, brand, or general term.
- Browse paginated results showing name, brand, and image.
- Open a product to see its details.
- Read detailed nutrition **only while holding an active Stripe subscription**.
- Switch the interface and product language between English, Dutch, German,
  and French.
- See their recent searches, persisted in MySQL.

---

## Architecture

```
                 +--------------------------+
                 |  Next.js 16 (port 3000)  |
                 |  Server Components + RQ  |
                 +------------+-------------+
                              | REST (NEXT_PUBLIC_API_URL)
                              v
                 +--------------------------+        +------------------+
                 |  Express 5 (port 4000)   |------->| Open Food Facts  |
                 |                          |        +------------------+
                 |  routes -> controllers   |        +------------------+
                 |  -> services             |------->|  Stripe API      |
                 |  -> repositories         |        +--------+---------+
                 +------------+-------------+                 | webhook
                              | Prisma                        |
                              v                               v
                 +--------------------------+        +------------------+
                 |       MySQL 8.4          |<-------| signature check  |
                 +--------------------------+        +------------------+
```

The browser talks **only** to the Express API. Open Food Facts and Stripe
secret operations are never reachable from the client.

### Backend layering

Each request flows `route -> controller -> service -> repository -> Prisma`.
Routes stay thin, controllers only handle HTTP, services hold business logic
with no Express dependency, and all Prisma access lives in repositories.

```
food-product-backend/src/
├── app.ts                        Express assembly (no listener - testable)
├── server.ts                     HTTP server + graceful shutdown
├── config/env.ts                 Zod-validated environment, fail-fast
├── lib/prisma.ts                 Prisma singleton
├── errors/                       AppError hierarchy
├── middleware/                   demo-user, validation, rate-limit, error
├── integrations/
│   ├── open-food-facts/          client, normalizer, types
│   └── stripe/                   SDK client
├── modules/
│   └── products/ searches/ subscriptions/ users/ webhooks/
├── routes/index.ts               /api mount points
├── types/                        ApiResponse envelope
└── utils/                        logger, pagination
```

### Frontend layering

```
food-product-frontend/
├── app/[locale]/                 Root layout under the locale segment
│   ├── layout.tsx                so <html lang> matches the language
│   ├── page.tsx                  Search page
│   └── products/[barcode]/       Product detail
├── components/
│   ├── ui/                       shadcn primitives
│   └── layout/ products/ search/ subscription/ states/ providers/
├── hooks/                        useProductSearch, useSubscription, ...
├── services/                     Typed API calls
├── lib/api-client.ts             The only place fetch is called
├── store/                        Zustand (UI state only)
├── i18n/                         Config, dictionaries, loader
├── types/                        Shared DTOs
└── proxy.ts                      Locale negotiation (Next 16 middleware)
```

---

## Setup

### 1. Prerequisites

Node.js 20+, npm, and Docker (or a MySQL 8 server of your own).

### 2. Clone and start MySQL

```bash
git clone <repository-url>
cd technical_test_project
docker compose up -d
```

This starts MySQL 8.4 on **port 3307** (chosen to avoid clashing with a local
MySQL on 3306) with database `food_product` and user `food` / `foodpassword`.

Wait for it to report healthy before running any Prisma command:

```bash
docker compose ps    
```

Running `prisma migrate` or `prisma:seed` too early fails with a connection
pool error (`pool failed to retrieve a connection`). That means MySQL is not
accepting connections yet, not that anything is misconfigured — wait and rerun.

### 3. Backend

```bash
cd food-product-backend
npm install
cp .env.example .env          # then fill in your Stripe test keys
npx prisma migrate dev        # creates tables from the committed migration
npm run prisma:seed           # creates the demo user
npm run dev                   # http://localhost:4000
```

### 4. Frontend

```bash
cd food-product-frontend
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

Open <http://localhost:3000> — you will be redirected to your preferred locale.

---

## Stripe setup

All work is done in **test mode**.

1. **Create the product and price** — Stripe Dashboard > Products > add a
   product with a *recurring monthly* price. Copy the price ID
   (`price_...`) into `STRIPE_PRICE_ID`.

2. **Copy your secret key** from Developers > API keys into
   `STRIPE_SECRET_KEY`.

3. **Forward webhooks locally** with the Stripe CLI:

   ```bash
   stripe login
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```

   The command prints a signing secret (`whsec_...`) — put it in
   `STRIPE_WEBHOOK_SECRET` and restart the backend.

4. **Required webhook events:**

   ```
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   ```

5. **Test the flow** — click *Subscribe*, pay with card `4242 4242 4242 4242`
   (any future expiry and CVC). The webhook then activates the subscription
   and nutrition becomes available.

You can also trigger events directly:

```bash
stripe trigger customer.subscription.deleted
```

---

## Open Food Facts integration

All integration code lives in
`food-product-backend/src/integrations/open-food-facts/`, isolated from
business logic so it can be stubbed in tests.

**Searching.** `GET /cgi/search.pl` is called with the validated query, page,
page size, an explicit `fields` allowlist, and the `lc` locale parameter.
Requesting only the needed fields keeps responses small and guarantees no
unexpected upstream field can leak through.

**Normalization.** Open Food Facts is community maintained, so any field can be
absent, blank, or the wrong type (numbers frequently arrive as strings). The
normalizer narrows every value and returns `null` for anything unusable:

```ts
interface Product {
  id: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutrition: Nutrition | null;
  nutritionLocked: boolean;
}
```

- Blank and whitespace-only strings become `null`.
- Numeric strings are coerced; non-numeric values become `null`.
- Image URLs are validated as absolute `http(s)` URLs or dropped.
- `brands` is a comma-separated list; only the primary brand is used.
- A product without a usable barcode is discarded rather than half-rendered.

The frontend then renders translated fallbacks — *Unknown brand*, *Product
name unavailable*, *No image available* — so `undefined` and `null` never
reach the screen.

**Localization.** Product names resolve in the order
`product_name_<locale>` → `product_name_en` → `product_name` →
`generic_name_<locale>` → ... so a missing translation degrades gracefully
instead of failing.

**Failure handling.** A hard `AbortController` timeout prevents a hanging
upstream from holding a worker open. Timeouts, rate limits (HTTP 429), error
statuses, and malformed payloads all map to **502 Bad Gateway** with a distinct
error code — never a generic 500, and never an upstream message.

---

## Internationalization

**Supported languages:** English, Dutch (Nederlands), German (Deutsch), French
(Français).

**How translations are stored.** Flat JSON dictionaries in
`food-product-frontend/i18n/dictionaries/`. The English file is the canonical
shape; `i18n/types.ts` derives `Dictionary` from it and
`dictionaries/conformance.ts` asserts the other three satisfy that type, so a
missing key is a **compile-time error** rather than a blank string at runtime.
A test additionally asserts key parity and that placeholders survive
translation.

**How language selection works.** Locale is the first path segment
(`/en`, `/nl/products/123`). `proxy.ts` — Next.js 16's renamed middleware —
redirects a locale-less URL to the best match using the cookie first, then
`Accept-Language`, then English.

The selector is a native `<select>`; changing it rewrites the current path onto
the new locale via `router.replace()` inside a transition. **No page reload
occurs** — only the Server Components re-render.

**Persistence.** The choice is stored in a `NEXT_LOCALE` cookie
(1 year, `SameSite=Lax`). A cookie was chosen over `localStorage` because the
proxy needs to read it *on the server* before the first byte is rendered,
which avoids a flash of the wrong language. The URL also carries the locale,
so a shared link opens in the language it was shared in.

**Product data** is localized by passing `lc` to Open Food Facts and resolving
localized fields with the fallback chain described above.

---

## Technical decisions

**Open Food Facts is called server-side.** It keeps the upstream contract
behind one boundary that owns validation, normalization, timeouts, and error
mapping. The client receives a single predictable shape, and the response is
trimmed to the fields the UI actually uses.

**Subscription access is enforced in the backend.** `productService.getByBarcode`
consults `subscriptionService.hasActiveSubscription` and only then attaches
nutrition. When access is denied the data is **absent from the response**, not
hidden by CSS or a client-side flag — so inspecting the page, editing
JavaScript, calling the API directly, or tampering with browser state yields
nothing. The response carries `nutritionLocked: true` purely so the UI knows to
show the subscription CTA rather than an "unavailable" message.

**The webhook is the only writer of subscription state.** Returning from
Checkout never grants access; a test asserts that starting checkout performs no
subscription write. Access requires a Stripe-signed event.

**Checkout returns the user where they started.** The frontend sends the page
it is on as a `returnPath`, and the backend resolves it against the configured
origin before handing it to Stripe. Anything that would leave the site - an
absolute URL, `//evil.com`, a `javascript:` URI - is rejected by validation, so
the caller-supplied value cannot become an open redirect. Back on the product
page, the UI polls until the webhook lands and then reveals the nutrition table
in place, with no reload.

**Access is granted by any qualifying subscription, not the newest row.** A
user who re-subscribes keeps the old row, so resolving access from the
most-recently-updated subscription can report `canceled` while an active one
exists. The lookup asks for any subscription that still grants access and only
falls back to the newest row to report a status.

**`currentPeriodEnd` comes from the subscription item.** In the current Stripe
API the billing period moved from the subscription onto its items, so the
handler reads the latest item period.

**Subscription status is derived, not duplicated.** The brief's example schema
placed `subscriptionStatus` on `User` *and* in `Subscription`. Storing it twice
invites drift between the two whenever a webhook updates one and not the other,
so `User` holds only `stripeCustomerId` and status is derived from the latest
`Subscription` row. Access additionally requires `currentPeriodEnd` to be in
the future, so a lapsed period revokes access even if a status update is
missed.

**Webhooks are idempotent.** Rows are upserted on `stripeSubscriptionId`, so
Stripe's retries and out-of-order deliveries converge on the same state.

**Route-based i18n with server-loaded dictionaries.** No i18n library is used —
four small dictionaries and a placeholder formatter cover the need without
shipping a runtime or a bundle of unused languages to the browser.

**Zustand holds only UI state.** Server data lives exclusively in React Query;
the store holds just the submitted query, so server state is never duplicated.

**Search is submit-driven, not live.** One request per intentional search
rather than one per keystroke. A `useDebounce` hook is provided for live search
should it be wanted later.

---

## Security

- **Input validation** — every body, query, and route param is parsed with Zod
  before reaching business logic; validated output replaces the raw input.
- **Backend authorization** — nutrition access is decided server-side against
  persisted state, never from client-supplied data.
- **Webhook signatures** — verified against the raw request body with
  `stripe.webhooks.constructEvent`. The webhook route is mounted with
  `express.raw()` *before* `express.json()` so the exact signed bytes survive.
- **No secret leaks** — errors are normalized centrally; stack traces, Prisma
  messages, Stripe messages, and internal details never reach the client. Tests
  assert that upstream error text is absent from responses.
- **CORS** — an explicit origin allowlist, not bare `cors()`.
- **Rate limiting** — 60 req/min on search endpoints, 10 req/min on checkout.
- **Helmet** security headers, `x-powered-by` disabled, 100 KB JSON body limit.
- **External data is sanitized** — Open Food Facts values are narrowed and
  validated, and image URLs are checked to be absolute `http(s)`.
- **Minimal data retention** — only an email, a Stripe customer id, search
  strings, and subscription status. No card data ever touches the application.
- **Secrets are environment-only**, validated at startup; `.env` is gitignored
  and only `.env.example` is committed.

### Documented security simplifications

These are deliberate, scoped to the exercise, and would change in production:

1. **No authentication.** A single demo user is resolved server-side from
   `DEMO_USER_EMAIL`. The important property is preserved — identity comes from
   the server and a client-supplied `userId` is always ignored (a test asserts
   this) — so swapping `withDemoUser` for real session or JWT middleware is a
   contained change. **As shipped, anyone who can reach the API acts as the
   demo user.**
2. **MySQL credentials in `docker-compose.yml`** are local development
   defaults, not secrets.
3. **The `food` database user is granted broad privileges** by
   `docker/mysql-init/01-grant-shadow-db.sql` because Prisma Migrate needs to
   create a shadow database. Production would scope the user to its own schema
   and deploy with `prisma migrate deploy`.
4. **No HTTPS locally**, so the locale cookie is not marked `Secure`.
5. **No CSRF protection**, since there are no cookie-authenticated
   state-changing requests.

---

## Testing

```bash
cd food-product-backend  && npm test    # 55 tests
cd food-product-frontend && npm test    # 37 tests
```

Tests are hermetic: Prisma, Stripe, and `fetch` are stubbed, so no suite
touches MySQL, Stripe, or Open Food Facts.

### Backend (Vitest + Supertest) — 55 tests

| File | Covers |
|---|---|
| `open-food-facts.normalizer.test.ts` | Complete products; missing/blank/malformed fields; locale fallback; brand list; invalid image URLs; numeric coercion; barcode-less entries |
| `products.api.test.ts` | Valid search returns normalized results; empty/missing/oversized params rejected `400`; upstream outage → `502`; rate limit → distinct code; **unsubscribed user receives no nutrition**; **active subscriber does**; lapsed and cancelled subscriptions revoke access; unknown barcode → `404` |
| `searches.api.test.ts` | Searches stored and retrieved; trimming; validation; de-duplication; **client-supplied `userId` ignored** |
| `subscriptions.api.test.ts` | Status reporting for each state; checkout session creation; customer reuse; **checkout grants no access**; Stripe failure → `502` without leaking the message |
| `stripe-webhook.test.ts` | **Missing, forged, and tampered signatures rejected**; valid events persist status; cancellation revokes; idempotent replay; unattributable and unrelated events handled |

Webhook tests sign payloads with Stripe's own `generateTestHeaderString`,
exercising the real verification path rather than mocking it away.

### Frontend (Vitest + React Testing Library) — 37 tests

| File | Covers |
|---|---|
| `product-card.test.tsx` | Name/brand/image fallbacks; no `undefined` or `null` rendered; alt text; localized links |
| `search-form.test.tsx` | Trimmed submission; min-length validation with `role="alert"` and `aria-invalid`; error clearing; disabled state; keyboard submission |
| `nutrition-section.test.tsx` | Subscribe CTA when locked; table when unlocked; per-field "not provided"; genuinely unavailable vs. gated; row headers |
| `i18n.test.ts` | Key parity across all four languages; translations differ from English; placeholders preserved; locale guard; formatter |
| `api-client.test.ts` | Envelope unwrapping; query building; `ApiError` mapping; network and unreadable-response failures; POST bodies; abort propagation |

Also verified manually end-to-end: live Open Food Facts search in all four
locales, search persistence in MySQL, signed-webhook activation unlocking
nutrition, and cancellation revoking it.

---

## API reference

All responses use one envelope:

```jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "..." } }
```

| Method | Endpoint | Description | Statuses |
|---|---|---|---|
| `GET` | `/health` | Liveness probe | `200` |
| `GET` | `/api/me` | The demo user | `200` |
| `GET` | `/api/products/search?q=&page=&pageSize=&locale=` | Paginated search | `200` `400` `429` `502` |
| `GET` | `/api/products/:barcode?locale=` | Product detail; nutrition only if subscribed | `200` `400` `404` `502` |
| `GET` | `/api/searches?limit=` | Recent searches | `200` `400` |
| `POST` | `/api/searches` | Record a search | `201` `400` |
| `GET` | `/api/subscription` | Subscription status | `200` |
| `POST` | `/api/subscription/checkout` | Create a Checkout Session | `201` `429` `502` |
| `POST` | `/api/webhooks/stripe` | Stripe events (signature verified) | `200` `400` |

---

## Database

```prisma
User          id · email(unique) · stripeCustomerId(unique?) · timestamps
Search        id · userId · query · createdAt       @@index([userId, createdAt])
Subscription  id · userId · stripeCustomerId · stripeSubscriptionId(unique)
              status(enum) · currentPeriodEnd? · timestamps
                                                    @@index([userId, status])
```

`SubscriptionStatus` mirrors Stripe's values exactly. Indexes match the two
real query patterns: recent searches by user ordered by date, and subscription
lookup by user. The committed migration reproduces the schema from an empty
database.

### Prisma 7 configuration

The project uses **Prisma 7.10.0**, which changes how the database connection
is supplied:

- `schema.prisma` declares only the `provider`. The `url` field is no longer
  permitted there.
- **CLI commands** (`migrate`, `db seed`, `studio`) read the URL from
  `prisma.config.ts`, which also replaces the `package.json#prisma` block that
  v7 removed.
- **The runtime client** takes a driver adapter instead of a URL.
  `src/lib/prisma.ts` constructs `PrismaClient` with
  `@prisma/adapter-mariadb` — the adapter Prisma ships for MySQL — which owns
  the connection pool. `prisma/seed.ts` does the same.

`DATABASE_URL` remains the single source of the connection string for both
paths.

### TypeScript configuration

The backend is CommonJS and uses `"module": "node16"` with
`"moduleResolution": "node16"`. This is the modern resolver for CommonJS
packages: it honours `package.json` `exports` maps, which Prisma 7 and other
current dependencies rely on, and replaces the legacy `node`/`node10` mode that
TypeScript 7 removes. The emitted output is unchanged CommonJS.

Three configs, each with one job:

| File | Purpose |
|---|---|
| `tsconfig.json` | The default an editor picks up. Covers `src/`, `prisma/` and `prisma.config.ts`, so opening any of them resolves Node globals and project types. Does not emit. |
| `tsconfig.build.json` | What `npm run build` uses. Narrows to `src/` and emits to `dist/`. |
| `tsconfig.test.json` | What typechecks `tests/`. Uses the `bundler` resolver, matching how Vitest actually resolves modules — under `node16` the dynamic `import()` that loads the app after `vi.mock()` would be treated as ESM and demand a file extension Vitest neither needs nor uses. It includes `src/` so the global Express `Request` augmentation in `src/types/express.d.ts` is in scope. |

`npm run typecheck` runs the app/tooling and test projects in sequence, so
neither can drift out of type safety.

If you see an error saying `datasource.url` is no longer supported *and* the
schema has no `url`, a stale client is being used: run `npx prisma generate`
from `food-product-backend/`. Note that a globally installed Prisma CLI or an
IDE extension may report against its own bundled version rather than the
project's — `npx prisma --version` from the backend directory should report
7.10.0.

---

## Troubleshooting

**`pool failed to retrieve a connection from pool (active=0 idle=0)`**

MySQL is not reachable. Almost always it is still starting, or the container is
not running:

```bash
docker compose ps          # wait for "healthy"
docker compose up -d       # if it is not running at all
```

The seed script detects this case and prints the same guidance instead of a
stack trace. The backend logs `Database is not reachable` at startup but keeps
serving, so `/health` responding does not by itself prove the database is up.

**Subscribed in Stripe, but nutrition is still locked**

The webhook did not reach the backend, so the subscription was never recorded.
Access is decided from the database, not from having completed checkout - this
is deliberate (see "The webhook is the only writer of subscription state").

Check that `stripe listen` is actually running and forwarding:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

It must stay running in its own terminal for the whole session; if it exits,
events are silently missed. Successful deliveries print
`<-- [200] POST http://localhost:4000/api/webhooks/stripe`.

To reconcile subscriptions that Stripe already has but the database missed:

```bash
npm run stripe:sync
```

This reads the demo user's subscriptions from Stripe and writes them through
the same service the webhook uses. It is a recovery tool for local development,
not part of the normal flow.

**Checkout fails with `No such price: 'whsec_...'`**

`STRIPE_PRICE_ID` holds a webhook secret rather than a price ID. The three
Stripe values have distinct prefixes and are not interchangeable:

| Variable | Prefix | Where to find it |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_` | Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_` | Printed by `stripe listen` |
| `STRIPE_PRICE_ID` | `price_` | Products > your product > recurring price |

The backend validates these prefixes at startup, so a swapped or placeholder
value now fails immediately with a message naming the variable instead of
surfacing later as a Stripe error during checkout.

**`Cannot find name 'process'` when opening a file in an editor**

The editor is not using the project's `tsconfig.json`. All TypeScript files —
`src/`, `prisma/` and `prisma.config.ts` — are covered by it, with `tests/`
covered by `tsconfig.test.json`. Restart the TS server, or open the
`food-product-backend/` directory as the workspace root.

**`datasource.url` is no longer supported**

A Prisma 7 binary is validating a schema that still has `url`, or a stale
client is in use. Run `npx prisma generate` from `food-product-backend/`. A
global Prisma CLI or IDE extension may also report against its own bundled
version — `npx prisma --version` from the backend directory should say 7.10.0.

---

## Known limitations

- **Single demo user, no authentication** — see security simplifications above.
- **Open Food Facts result counts are approximate**, so the last page can hold
  fewer items than the page size.
- **Product data quality varies.** Many community-contributed products lack a
  brand, image, or nutriments; the application degrades gracefully but cannot
  supply data that does not exist upstream.
- **Product localization depends on upstream translations.** Where a product
  has no translated name, the fallback chain shows another language rather than
  translating it.
- **No caching layer.** Every search reaches Open Food Facts. React Query
  caches per session client-side; a server-side cache was not added because the
  benefit is unclear at this scale.
- **A Stripe subscription created outside the app** is attributed via the
  customer id, and skipped if that customer is unknown locally.
- **Subscription activation is not instant.** The UI polls briefly after
  checkout until the webhook arrives; without the Stripe CLI running locally,
  it never will.
- **No E2E test suite.** Flows were verified manually; Playwright would be the
  natural addition.
- **Three `npm overrides` pin transitive dependencies** (`mariadb`, `mysql2`,
  `deepmerge-ts`) to patched releases — rationale in
  `food-product-backend/OVERRIDES.md`. Prisma 7.10.0 pins `mariadb` to exactly
  3.4.5, which carries credential-disclosure and SQL-injection advisories, and
  its CLI pulls vulnerable `mysql2` and `deepmerge-ts`. The overrides raise all
  three to fixed versions; `npm audit` reports **0 vulnerabilities**. They can
  be dropped once Prisma bumps its own pins.
- **Prisma 8 is already `latest` on npm** but is a release candidate
  (`8.0.0-rc.13`), so this project stays on the stable 7.10.0. Installing with
  `prisma@latest` will pull the RC — pin the version explicitly.

---

## Commands

| | Backend | Frontend |
|---|---|---|
| Dev | `npm run dev` | `npm run dev` |
| Build | `npm run build` | `npm run build` |
| Start | `npm start` | `npm start` |
| Test | `npm test` | `npm test` |
| Typecheck | `npm run typecheck` | `npm run typecheck` |
| Lint | — | `npm run lint` |
| Migrate | `npm run prisma:migrate` | — |
| Seed | `npm run prisma:seed` | — |
| Sync Stripe | `npm run stripe:sync` | — |
