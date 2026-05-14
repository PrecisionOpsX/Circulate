import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Pixel size of the emblem. */
  size?: number;
  /** Hide the wordmark, show only the emblem. */
  markOnly?: boolean;
  /** Wordmark colour. Use "light" on dark backgrounds. */
  tone?: "dark" | "light";
};

/** Circulate logo: the brand emblem (public/logo.png) + wordmark. */
export function Logo({
  className,
  size = 40,
  markOnly = false,
  tone = "dark",
}: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={`${APP_NAME} home`}
    >
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
        priority
      />
      {!markOnly && (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            tone === "light" ? "text-white" : "text-brand-900",
          )}
        >
          {APP_NAME}
        </span>
      )}
    </Link>
  );
}
