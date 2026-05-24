import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import AppBrand from "./components/app-brand";
import AppHeaderNavigation from "./components/app-header-navigation";
import AppLanguageMenu from "./components/app-language-menu";
import AppThemeSwitch from "./components/app-theme-switch";
import AccountMenu from "./components/account-menu";
import { getCurrentActor } from "./lib/auth-server";
import { APP_THEME_COOKIE_NAME, DEFAULT_APP_THEME, resolveAppTheme } from "./lib/app-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCiVera",
  description: "OpenCiVera platform foundation on Next.js"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialTheme = resolveAppTheme(cookieStore.get(APP_THEME_COOKIE_NAME)?.value || DEFAULT_APP_THEME);
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
    <html lang="en" data-app-theme={initialTheme}>
      <body data-app-theme={initialTheme}>
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
              accessory={<AppThemeSwitch initialTheme={initialTheme} />}
            />
          </div>
        </header>
        <main className="app-shell app-main">{children}</main>
      </body>
    </html>
  );
}
