/** App-wide constants. Business rules live here so they're easy to audit. */

export const APP_NAME = "Circulate";
export const APP_TAGLINE = "Trade goods & services with community credits.";
export const APP_DESCRIPTION =
  "Circulate is a local marketplace where neighbours trade goods and services using platform credits instead of cash.";

/** Wallet / credit rules. */
export const CREDIT_RULES = {
  /** Default signup grant when the platform_settings table is unreachable.
   *  The live value lives in DB (platform_settings.signup_credit_grant)
   *  and is admin-editable; this constant is just a safe fallback. */
  STARTING_BALANCE: 50,
  /** Platform fee taken from every completed transaction, into the reserve. */
  FEE_RATE: 0.06,
} as const;

/** Fixed id of the single platform reserve wallet (see supabase/seed.sql). */
export const RESERVE_WALLET_ID = "00000000-0000-0000-0000-000000000001";

/** Supabase Storage bucket holding listing photos. */
export const LISTING_PHOTOS_BUCKET = "listing-photos";

/** Supabase Storage bucket holding profile avatars. */
export const AVATAR_BUCKET = "avatars";

/** Avatar upload limits. Smaller cap than listing photos because avatars
 *  are displayed at small sizes everywhere. */
export const AVATAR_LIMITS = {
  MAX_BYTES: 2 * 1024 * 1024,
} as const;

/** Listing creation rules, mirrored by the Zod schema + DB constraints. */
export const LISTING_LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 2000,
  MAX_PRICE: 100000,
  MAX_PHOTOS: 8,
  MAX_PHOTO_BYTES: 5 * 1024 * 1024,
} as const;

/** Image MIME types accepted for photo uploads (matches the bucket config). */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Listings shown per page on the browse grid. */
export const BROWSE_PAGE_SIZE = 24;

/** Sort options for the browse grid. */
export const LISTING_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;
export type ListingSort = (typeof LISTING_SORTS)[number]["value"];

/**
 * Credit packages offered on the buy-credits page. Prices are in cents to
 * match Stripe's `unit_amount` and avoid floating-point drift.
 */
export const CREDIT_PACKAGES = [
  {
    id: "starter",
    credits: 50,
    amountUsdCents: 500,
    label: "Starter",
    blurb: "Try the marketplace.",
  },
  {
    id: "popular",
    credits: 150,
    amountUsdCents: 1200,
    label: "Popular",
    blurb: "Best per-credit value.",
    popular: true,
  },
  {
    id: "power",
    credits: 500,
    amountUsdCents: 3500,
    label: "Power",
    blurb: "Stock up and save.",
  },
] as const;
export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]["id"];

/** Preset reasons offered when reporting a listing. */
export const REPORT_REASONS = [
  "Prohibited or illegal item",
  "Scam or fraud",
  "Inaccurate or misleading listing",
  "Offensive or inappropriate content",
  "Spam",
  "Other",
] as const;

/** Primary navigation shown in the header. */
export const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/how-it-works", label: "How it works" },
] as const;
