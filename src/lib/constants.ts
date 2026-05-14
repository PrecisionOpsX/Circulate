/** App-wide constants. Business rules live here so they're easy to audit. */

export const APP_NAME = "Circulate";
export const APP_TAGLINE = "Trade goods & services with community credits.";
export const APP_DESCRIPTION =
  "Circulate is a local marketplace where neighbours trade goods and services using platform credits instead of cash.";

/** Wallet / credit rules (enforced by the wallet engine in Milestone 3). */
export const CREDIT_RULES = {
  /** Every user starts here. */
  STARTING_BALANCE: 0,
  /** Hard floor. Purchasing is frozen once a balance is below 0 and
   *  cannot push past this on the way down. */
  MIN_BALANCE: -100,
  /** Platform fee taken from every completed transaction, into the reserve. */
  FEE_RATE: 0.06,
} as const;

/** Fixed id of the single platform reserve wallet (see supabase/seed.sql). */
export const RESERVE_WALLET_ID = "00000000-0000-0000-0000-000000000001";

/** Primary navigation shown in the header. */
export const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/how-it-works", label: "How it works" },
] as const;
