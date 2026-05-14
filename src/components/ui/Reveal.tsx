"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms before the animation runs. */
  delay?: number;
  /** Element to render as. Defaults to a div. */
  as?: ElementType;
};

/**
 * Fades + slides its children up the first time they enter the viewport.
 *
 * Fails safe: content is only held hidden while JS is actively arming the
 * animation. If IntersectionObserver is unavailable, the element is already
 * on screen at mount, or the observer never fires, the content is revealed
 * anyway, so it can never get stuck invisible. Respects
 * prefers-reduced-motion (handled in globals.css).
 */
export function Reveal({ children, className, delay = 0, as }: RevealProps) {
  const Tag = as ?? "div";
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setVisible(true);
    };

    // No observer support: just show the content.
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    // Already within the viewport at mount: reveal straight away.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);

    // Safety net: never leave content hidden indefinitely if, for whatever
    // reason, the observer doesn't fire.
    const fallback = window.setTimeout(reveal, 1400);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
