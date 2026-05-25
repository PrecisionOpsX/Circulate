import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { headers } from "next/headers";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TopProgressBar } from "@/components/layout/TopProgressBar";
import { AdBanner } from "@/components/ads/AdBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The /admin section ships its own header, nav and footer (see
  // src/app/admin/layout.tsx), so the public site chrome is skipped
  // there. x-pathname is set by the proxy (src/lib/supabase/middleware).
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {!isAdminArea && <Header />}
        <main className="flex flex-1 flex-col">
          {!isAdminArea && (
            <div className="mx-auto w-full max-w-4xl px-4">
              <AdBanner slot="top-1" className="mt-4 sm:mt-6" />
              <AdBanner slot="top-2" className="mt-2" />
            </div>
          )}
          {children}
        </main>
        {!isAdminArea && <Footer />}
      </body>
    </html>
  );
}
