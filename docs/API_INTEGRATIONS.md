# Marketplace & advertising integrations

The integration layer is built to the **production shape** but deliberately performs **no live
calls** in this build. It never fabricates API responses and never claims a connection it does not
have.

## Connectors

Defined in [`src/server/connectors/registry.ts`](../src/server/connectors/registry.ts) (server-only):

| Connector | Required env | Rate limit | Provides |
| --- | --- | --- | --- |
| Amazon Selling Partner API | `AMAZON_SP_CLIENT_ID`, `AMAZON_SP_CLIENT_SECRET`, `AMAZON_SP_APP_ID` | ~1/min | Orders, Catalogue, Inventory, Sales & traffic |
| Amazon Ads API | `AMAZON_ADS_CLIENT_ID`, `AMAZON_ADS_CLIENT_SECRET` | 1/s | Sponsored Products / Brands / Display reports |
| Flipkart Seller APIs | `FLIPKART_APP_ID`, `FLIPKART_APP_SECRET` | 1/s | Orders, Listings, Inventory |
| Meta Marketing API | `META_APP_ID`, `META_APP_SECRET` | 2/s | Campaigns, Ad sets, Ads, Insights |

Each connector exposes `status()`, `authorizationUrl()`, `exchangeCode()`, `refresh()`, and
`sync()` behind a common `Connector` interface, separate from the dashboard presentation layer.

## Status is derived from the environment, honestly

`GET /api/v1/integrations` returns each connector's live status, computed only from whether its
required env vars are present:

- **No credentials** → `connection: "pending_configuration"`, message **"Integration pending
  configuration."**
- **Credentials present** → `connection: "configured_not_authorized"`, with a message stating that
  authorisation and sync are not implemented in this build.
- `connection` is **never** `"connected"` and `authorization` is always `"none"` in this build.

## What is deliberately not implemented

`exchangeCode()`, `refresh()` and `sync()` throw `IntegrationPendingError` instead of returning
invented data. The OAuth `authorizationUrl()` is constructed correctly (so the flow can be shown)
but there is no token exchange, no data pull, and no write-back. This is intentional: the demo must
never imply a real Amazon/Flipkart/Meta account has been read or modified.

## Supporting infrastructure (shape, ready for production)

- **Token vault** (`token-vault.ts`): AES-256-GCM envelope encryption, random 96-bit IV per value,
  format `v1.<iv>.<tag>.<ciphertext>` (base64url). Requires a 32-byte `TOKEN_ENCRYPTION_KEY`
  (from a KMS in production). Tokens are never stored or logged in plaintext.
- **Resilience** (`resilience.ts`): retry/backoff and error-handling scaffolding for real calls.
- **Rate limiting** (`rate-limit.ts`): per-connector limits recorded in the registry.
- **Sync logs**: the production schema has a `SyncLog` model for synchronisation history.

## Going live later

1. Register apps with each provider and obtain credentials.
2. Set the env vars above plus `TOKEN_ENCRYPTION_KEY` and `DATABASE_URL`.
3. Implement `exchangeCode`/`refresh`/`sync` per provider, persisting sealed tokens via the vault
   and rows via Prisma.
4. Point data hooks at the synced tables instead of the demo generator.
5. Set `NEXT_PUBLIC_DEMO_MODE=false`.

Until a connector is fully wired, its screens continue to show **"Integration pending
configuration."** rather than fake live data.
