import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import AppBrand from "./components/app-brand";
import AppHeaderNavigation from "./components/app-header-navigation";
import AppLanguageMenu from "./components/app-language-menu";
import AppThemeSwitch from "./components/app-theme-switch";
import AccountMenu from "./components/account-menu";
import { getCurrentActor } from "./lib/auth-server";
import { isAdminRole } from "./lib/rbac";
import { APP_THEME_COOKIE_NAME, DEFAULT_APP_THEME, resolveAppTheme } from "./lib/app-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCiVera",
  description: "OpenCiVera platform foundation on Next.js",
  icons: {
    icon: "/favicon.svg",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialTheme = resolveAppTheme(cookieStore.get(APP_THEME_COOKIE_NAME)?.value || DEFAULT_APP_THEME);
  const actor = await getCurrentActor();
  const isAdmin = actor ? isAdminRole(actor.role) : false;
  const navItems = actor
    ? [
        ...(isAdmin ? [{ href: "/user", label: "Personal Hub" }] : []),
        { href: "/dashboard", label: "Dashboard" },
        { href: "/resume", label: "Sample CV" },
      ]
    : [
        { href: "/login?mode=signup", label: "Sign up", emphasis: "primary" as const },
        { href: "/login?mode=signin", label: "Sign in", emphasis: "secondary" as const },
      ];

  return (
    <html lang="en" data-app-theme={initialTheme} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body data-app-theme={initialTheme}>
        <header className="app-header">
          <div className="app-shell app-header__inner">
            <div className="app-header__branding">
              <AppBrand />
              {isAdmin ? <AppLanguageMenu /> : null}
            </div>
            <AppHeaderNavigation
              items={navItems}
              leadingAccessory={actor ? null : <AppThemeSwitch initialTheme={initialTheme} />}
              account={
                actor ? (
                  <AccountMenu
                    email={actor.email}
                    displayName={actor.displayName}
                    firstName={actor.firstName}
                    lastName={actor.lastName}
                    avatarUrl={actor.avatarUrl}
                    role={actor.role}
                    isActive={actor.isActive}
                    emailConfirmed={actor.emailConfirmed}
                  />
                ) : null
              }
              accessory={actor ? <AppThemeSwitch initialTheme={initialTheme} /> : null}
              forceInlineItems={!actor}
            />
          </div>
        </header>
        <main className="app-shell app-main">{children}</main>
      </body>
    </html>
  );
}
