import type { Metadata, Viewport } from "next";
import AppBrand from "./components/app-brand";
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
          { href: "/user", label: "Personal Hub" },
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
            <div className="app-header__branding">
              <AppBrand />
              <AppLanguageMenu />
            </div>
            <AppHeaderNavigation
              items={navItems}
              account={
                actor ? (
                  <AccountMenu
                    email={actor.email}
                    displayName={actor.displayName}
                    avatarUrl={actor.avatarUrl}
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
