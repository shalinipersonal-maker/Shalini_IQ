import "server-only";
import { IntegrationPendingError, type Connector, type ConnectorId, type ConnectorStatus } from "./types";

interface Spec { id: ConnectorId; label: string; provides: string[]; requiredEnv: string[]; rateLimitPerSecond: number; authBase: string }

const SPECS: Spec[] = [
  { id: "amazon-sp", label: "Amazon Selling Partner API", provides: ["Orders", "Catalogue", "Inventory", "Sales and traffic reports"], requiredEnv: ["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET", "AMAZON_SP_APP_ID"], rateLimitPerSecond: 0.0167, authBase: "https://sellercentral.amazon.in/apps/authorize/consent" },
  { id: "amazon-ads", label: "Amazon Ads API", provides: ["Sponsored Products", "Sponsored Brands", "Sponsored Display reports"], requiredEnv: ["AMAZON_ADS_CLIENT_ID", "AMAZON_ADS_CLIENT_SECRET"], rateLimitPerSecond: 1, authBase: "https://www.amazon.com/ap/oa" },
  { id: "flipkart-seller", label: "Flipkart Seller APIs", provides: ["Orders", "Listings", "Inventory"], requiredEnv: ["FLIPKART_APP_ID", "FLIPKART_APP_SECRET"], rateLimitPerSecond: 1, authBase: "https://api.flipkart.net/oauth-service/oauth/authorize" },
  { id: "meta-marketing", label: "Meta Marketing API", provides: ["Campaigns", "Ad sets", "Ads", "Insights"], requiredEnv: ["META_APP_ID", "META_APP_SECRET"], rateLimitPerSecond: 2, authBase: "https://www.facebook.com/dialog/oauth" },
];

/**
 * Builds a connector from its spec. Status is derived from the server environment only.
 * Token exchange and sync are deliberately NOT implemented in this build: they throw
 * IntegrationPendingError instead of returning invented data. See docs/API_INTEGRATIONS.md.
 */
function make(spec: Spec): Connector {
  const missing = () => spec.requiredEnv.filter((k) => !process.env[k]);
  return {
    ...spec,
    status(): ConnectorStatus {
      const missingEnv = missing();
      const configured = missingEnv.length === 0;
      return {
        id: spec.id, label: spec.label, provides: spec.provides, requiredEnv: spec.requiredEnv, missingEnv,
        connection: configured ? "configured_not_authorized" : "pending_configuration",
        authorization: "none",
        message: configured ? "Credentials are present on the server, but authorisation and data sync are not implemented in this build." : "Integration pending configuration.",
        lastSyncAt: null,
      };
    },
    authorizationUrl(tenantId, redirectUri, state) {
      if (missing().length) throw new IntegrationPendingError(spec.id);
      const u = new URL(spec.authBase);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("state", `${tenantId}.${state}`);
      return u.toString();
    },
    async exchangeCode() { throw new IntegrationPendingError(spec.id, "Token exchange is not implemented."); },
    async refresh() { throw new IntegrationPendingError(spec.id, "Token refresh is not implemented."); },
    async sync(resource) { throw new IntegrationPendingError(spec.id, `Sync for "${resource}" is not implemented.`); },
  };
}

export const connectors: Connector[] = SPECS.map(make);
export const getConnector = (id: ConnectorId) => connectors.find((c) => c.id === id)!;
