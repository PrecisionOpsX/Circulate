import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileMenu } from "@/components/layout/MobileMenu";

/** Sticky top navigation. Auth-aware: shows the user menu when signed in. */
export async function Header() {
  const user = await getSessionUser();

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
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" variant="gradient">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}
          <MobileMenu isAuthenticated={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
