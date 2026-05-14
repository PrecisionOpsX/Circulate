/**
 * Stock imagery for marketing pages. IDs are Unsplash photo IDs; the host
 * is allow-listed in next.config.ts.
 */
export function stockImage(id: string, w = 1200): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
}

export const STOCK = {
  heroFlatlay: "1556905055-8f358a7a47b2", // folded clothes flat-lay
  electronics: "1460925895917-afdab827c52f", // laptop / tech
  homeGarden: "1521334884684-d80222895322", // houseplants
  clothing: "1441986300917-64674bd600d8", // clothing rail
  fresh: "1542838132-92c53300491e", // fresh produce
  services: "1521737711867-e3b97375f902", // people collaborating
  trade: "1556742502-ec7c0e9f34b1", // hands exchanging
  community: "1556909114-f6e7ad7d3136", // people cooking together
} as const;
