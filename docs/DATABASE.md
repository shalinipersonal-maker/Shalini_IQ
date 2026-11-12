# Database

The production data model lives in [`prisma/schema.prisma`](../prisma/schema.prisma) (PostgreSQL via
Prisma). **It is not used by demo mode**, which runs entirely on generated sample data in the
browser. The schema is included so the demo's shape maps cleanly onto a real backend.

## Models

Identity & tenancy: `Organization`, `User`, `Role`, `Permission`, `RolePermission`, `Employee`,
`Client`, `ClientAssignment`.

Accounts & sync: `MarketplaceAccount`, `AdvertisingAccount`, `SyncLog`.

Commerce: `Product`, `Order`, `OrderItem`, `SalesMetric`, `Inventory`.

Advertising: `Campaign`, `AdSet`, `Ad`, `CampaignMetric`.

Intelligence & creative: `AiRecommendation`, `CreativeTemplate`, `CreativeProject`,
`CreativeVersion`, `CreativeAsset`.

Operations: `Lead`, `Report`, `Notification`, `AuditLog`.

Enums: `Marketplace`, `AdPlatform`, `ConnectionStatus`, `CampaignStatus`, `ClientStatus`,
`UserStatus`.

## Tenant isolation

The platform is agency-oriented: one `Organization` (the agency) manages many `Client`s. The rule
is that **a client must never read another client's private data**.

- Every business row carries `organizationId`; rows that belong to a single client also carry
  `clientId`.
- Application queries are always scoped by `organizationId`, and by `clientId` for client-scoped
  resources. Employees see only the clients they are assigned to via `ClientAssignment`.
- In production this is enforced in defence-in-depth with PostgreSQL **row-level security**: a
  per-request session variable carries the tenant, and RLS policies restrict every client-scoped
  table to matching rows, so an application bug cannot leak across tenants.
- Marketplace/advertising tokens are **never** stored in plaintext — see
  [`API_INTEGRATIONS.md`](API_INTEGRATIONS.md) and the token vault
  (`src/server/connectors/token-vault.ts`, AES-256-GCM).

## Working with the schema

```bash
npx prisma validate          # check the schema
npx prisma format            # format it
npx prisma generate          # generate the client (needs the datasource)
npx prisma migrate dev       # create/apply a migration (requires DATABASE_URL)
```

`DATABASE_URL` is required only when you connect a real database; the demo never reads it. See
[`ENVIRONMENT_SETUP.md`](ENVIRONMENT_SETUP.md).

## Demo ↔ model mapping

| Demo concept (`src/lib/demo/types.ts`) | Production model |
| --- | --- |
| `Client`, `Employee` | `Client`, `Employee`, `ClientAssignment` |
| `Product` | `Product`, `Inventory` |
| `SalesRow` | `Order` + `OrderItem`, aggregated into `SalesMetric` |
| `Campaign` / ad sets / ads | `Campaign`, `AdSet`, `Ad`, `CampaignMetric` |
| AI insight | `AiRecommendation` |
| Creative project/version | `CreativeProject`, `CreativeVersion`, `CreativeAsset`, `CreativeTemplate` |
| Report record, audit entry | `Report`, `AuditLog` |
