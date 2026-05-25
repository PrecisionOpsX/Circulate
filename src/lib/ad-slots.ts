/** Named ad slots used across the app. */
export const AD_SLOTS = [
  { value: "top-1",         label: "Top banner 1 (all pages)" },
  { value: "top-2",         label: "Top banner 2 (all pages)" },
  { value: "dashboard-mid", label: "Dashboard mid-section" },
] as const;

export type AdSlotValue = (typeof AD_SLOTS)[number]["value"];
