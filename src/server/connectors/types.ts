/** Contracts every marketplace / ad-platform connector implements. The dashboard never imports a concrete connector. */
export type ConnectorId = "amazon-sp" | "amazon-ads" | "flipkart-seller" | "meta-marketing";
export type ConnectionState = "pending_configuration" | "configured_not_authorized" | "connected" | "error";
export type AuthorizationState = "none" | "authorized" | "expired" | "revoked";

export interface ConnectorStatus {
  id: ConnectorId;
  label: string;
  provides: string[];
  connection: ConnectionState;
  authorization: AuthorizationState;
  message: string;
  requiredEnv: string[];
  missingEnv: string[];
  lastSyncAt: string | null;
}
export interface TokenSet { accessToken: string; refreshToken?: string; expiresAt: number; scope?: string }
export interface SyncContext { tenantId: string; accountId: string; since: Date; until: Date }
export interface SyncLogEntry { connector: ConnectorId; tenantId: string; resource: string; startedAt: Date; finishedAt: Date; status: "success" | "partial" | "failed"; records: number; attempts: number; error?: string }
export interface SyncResult<T> { records: T[]; nextCursor?: string; log: SyncLogEntry }

export interface Connector {
  id: ConnectorId;
  label: string;
  provides: string[];
  requiredEnv: string[];
  /** Requests per second allowed by the upstream API for the default operation; used to size the rate limiter. */
  rateLimitPerSecond: number;
  status(): ConnectorStatus;
  authorizationUrl(tenantId: string, redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
  refresh(token: TokenSet): Promise<TokenSet>;
  sync(resource: string, ctx: SyncContext, token: TokenSet): Promise<SyncResult<unknown>>;
}

export class IntegrationPendingError extends Error {
  constructor(public connector: ConnectorId, detail = "") {
    super(`Integration pending configuration.${detail ? " " + detail : ""}`);
    this.name = "IntegrationPendingError";
  }
}
