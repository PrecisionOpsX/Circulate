import Image, { type ImageProps } from "next/image";

/**
 * next/image for already-optimized remote stock photography (Unsplash CDN).
 *
 * Stock URLs from `stockImage()` are already CDN-optimized, format-negotiated
 * and width-sized, so we skip Next's image optimizer (`unoptimized`). That
 * avoids redundant re-encoding and, in production, keeps marketing imagery
 * off the hosting image-optimization quota.
 */
export function StockImage(props: Omit<ImageProps, "unoptimized">) {
  // `alt` is required by ImageProps and always passed through by callers.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} unoptimized />;
}
