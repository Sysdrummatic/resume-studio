import type { Metadata, Viewport } from "next";
import Link from "next/link";
import AppHeaderNavigation from "./components/app-header-navigation";
import AppLanguageMenu from "./components/app-language-menu";
import AccountMenu from "./components/account-menu";
import { getCurrentActor } from "./lib/auth-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCVHub",
  description: "OpenCVHub platform foundation on Next.js"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await getCurrentActor();
  const navItems = [
    ...(actor
      ? [
          { href: "/dashboard", label: "Dashboard" },
        ]
      : []),
    { href: "/resume", label: "Sample CV" },
    ...(!actor ? [{ href: "/login", label: "Login" }] : []),
  ];

  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="app-shell app-header__inner">
            <Link className="app-brand" href="/">
              OpenCVHub
            </Link>
            <AppHeaderNavigation
              items={navItems}
              language={<AppLanguageMenu />}
              account={
                actor ? (
                  <AccountMenu
                    email={actor.email}
                    role={actor.role}
                    isActive={actor.isActive}
                    emailConfirmed={actor.emailConfirmed}
                  />
                ) : null
              }
            />
          </div>
        </header>
        <main className="app-shell app-main">{children}</main>
      </body>
    </html>
  );
}
