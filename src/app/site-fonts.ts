import { Geist, Instrument_Serif } from "next/font/google";

/** Website type: Geist for text and headings, Instrument Serif italic for accent words. */
export const siteSans = Geist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-royal", display: "swap" });
export const siteSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-accent", display: "swap" });
export const ROYAL = `royal ${siteSans.variable} ${siteSerif.variable}`;
