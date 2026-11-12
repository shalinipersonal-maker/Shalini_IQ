import type { Scope } from "../analytics/metrics";
import { fmtDate } from "../dates";
import { computeInsights, type Insight, type InsightSettings } from "./insights";
import { generateCopy, type CopyRequest, type CopyResult } from "./copy";

/**
 * AI service abstraction. The UI only talks to this interface, so a hosted model can replace the demo
 * engine without touching any screen. A production provider must run server-side (API keys never reach
 * the browser) — see docs/ARCHITECTURE.md § AI service.
 */
export interface AIProvider {
  id: string;
  label: string;
  /** True when output is produced by local rules over sample data rather than a hosted model. */
  demo: boolean;
  generateInsights(scope: Scope, cfg: InsightSettings): Promise<Insight[]>;
  explainInsight(insight: Insight, scope: Scope): Promise<string[]>;
  generateCopy(req: CopyRequest): Promise<CopyResult>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoProvider: AIProvider = {
  id: "demo-rules",
  label: "Demo insight engine (rules on sample data)",
  demo: true,
  async generateInsights(scope, cfg) {
    await wait(650); // lets the UI show its analysing state; the computation itself is instant
    return computeInsights(scope, cfg);
  },
  async explainInsight(insight, scope) {
    await wait(350);
    return [
      `How this was worked out: ${insight.method}`,
      `Data used: sample data for ${scope.ds.client.name}, ${fmtDate(scope.from)} to ${fmtDate(scope.to)}${scope.marketplace === "all" ? ", all marketplaces" : `, ${scope.marketplace} only`}.`,
      insight.confidence === null
        ? "No confidence score is shown because this is a descriptive summary rather than a prediction or recommendation."
        : `Confidence of ${Math.round(insight.confidence * 100)}% is a heuristic based on how much data supports the finding and how large the effect is. It is not a statistical probability.`,
      "This insight was produced by the demo rules engine. A connected AI provider would add narrative reasoning on top of the same figures.",
    ];
  },
  async generateCopy(req) {
    await wait(500);
    return generateCopy(req);
  },
};

export function getAIProvider(): AIProvider {
  return demoProvider;
}
