/**
 * Shalini_IQ agency pricing — single source for the public site, the fee calculator and the sign-up page.
 * Amounts are INR and exclude GST. Change them here only.
 */
export const PRICING = {
  setupFee: 250_000,
  platformFee: 15_000,
  perSeller: 1_500,
  minimumTermMonths: 6,
  prepayDiscount: 0.1,
  gstRate: 0.18,
  extraHourRate: 1_200,
  includedHoursPerMonth: 8,
} as const;

export interface FeeQuote {
  sellers: number;
  monthly: number;
  monthlyAfterDiscount: number;
  yearly: number;
  firstYear: number;
  gstOnMonthly: number;
  perSellerEffective: number;
}

/** What an agency pays for `sellers` active seller accounts. `prepay` applies the 12-month discount to monthly fees. */
export function quote(sellersIn: number, prepay = false): FeeQuote {
  const sellers = Math.max(0, Math.round(Number.isFinite(sellersIn) ? sellersIn : 0));
  const monthly = PRICING.platformFee + sellers * PRICING.perSeller;
  const monthlyAfterDiscount = prepay ? Math.round(monthly * (1 - PRICING.prepayDiscount)) : monthly;
  const yearly = monthlyAfterDiscount * 12;
  return {
    sellers,
    monthly,
    monthlyAfterDiscount,
    yearly,
    firstYear: yearly + PRICING.setupFee,
    gstOnMonthly: Math.round(monthlyAfterDiscount * PRICING.gstRate),
    perSellerEffective: sellers > 0 ? Math.round(monthlyAfterDiscount / sellers) : monthlyAfterDiscount,
  };
}

/**
 * The agency's own side of the sum: what its sellers pay it versus what it pays for Shalini_IQ.
 * `avgRetainer` is the agency's average monthly fee per seller — entered by the visitor, never assumed.
 */
export function agencyShare(sellers: number, avgRetainer: number, prepay = false) {
  const q = quote(sellers, prepay);
  const agencyRevenue = Math.max(0, sellers) * Math.max(0, avgRetainer);
  return { agencyRevenue, platformCost: q.monthlyAfterDiscount, share: agencyRevenue > 0 ? q.monthlyAfterDiscount / agencyRevenue : null };
}
