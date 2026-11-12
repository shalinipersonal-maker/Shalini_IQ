import type { Product } from "@/lib/demo/types";

/** Shalini's own shop — the only brand the Creative Studio designs for in this build (no sample clients). */
export const SHOP = { id: "shalz", name: "Shalz Materials & Ornaments", hue: 350 };

/** Same shape the Studio used to read from the sample workspace, now pointing at the real shop. */
export function useShopScope(): { ds: { client: typeof SHOP; products: Product[] } } {
  return { ds: { client: SHOP, products: [] } };
}
