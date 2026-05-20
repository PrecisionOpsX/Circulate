import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getMyUnreadCount } from "@/lib/messaging";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileMenu } from "@/components/layout/MobileMenu";

/** Sticky top navigation. Auth-aware: shows the user menu when signed in. */
export async function Header() {
  const user = await getSessionUser();
  const unread = user ? await getMyUnreadCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Logo size={38} />
          <nav className="hidden gap-1 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-brand-50 hover:text-brand-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-50 hover:text-brand-800"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09c0 .67.39 1.27 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82c.24.61.84 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.67 0-1.27.39-1.51 1z" />
                </svg>
              </Link>
              <Link
                href="/messages"
                aria-label={
                  unread > 0
                    ? `Messages, ${unread} unread`
                    : "Messages"
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-50 hover:text-brand-800"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Button asChild size="sm" variant="gradient" className="hidden sm:inline-flex">
                <Link href="/listings/new">+ New listing</Link>
              </Button>
              <UserMenu
                displayName={user.profile.display_name}
                avatarUrl={user.profile.avatar_url}
                isAdmin={user.profile.role === "admin"}
              />
            </>
          ) : (
            <>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" variant="gradient">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
              {/* Guests on narrow viewports get the hamburger with marketing
                  nav + sign-up CTAs. Signed-in users navigate via the avatar
                  dropdown. */}
              <MobileMenu isAuthenticated={false} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
