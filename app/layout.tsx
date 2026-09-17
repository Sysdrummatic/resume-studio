import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import AppBrand from "./components/app-brand";
import AppHeaderNavigation from "./components/app-header-navigation";
import AppLanguageMenu from "./components/app-language-menu";
import AppThemeSwitch from "./components/app-theme-switch";
import AccountMenu from "./components/account-menu";
import { AppI18nProvider } from "./components/app-i18n-provider";
import { getRequestAppI18n } from "./i18n/server";
import { getCurrentActor } from "./lib/auth-server";
import { getAccessRestriction } from "./lib/access-restriction";
import { isAdminRole } from "./lib/rbac";
import { APP_THEME_COOKIE_NAME, DEFAULT_APP_THEME, resolveAppTheme } from "./lib/app-theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: "OpenCiVera",
    description: dictionary.meta.description,
    icons: {
      icon: "/favicon.svg",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const appI18n = await getRequestAppI18n();
  const initialTheme = resolveAppTheme(cookieStore.get(APP_THEME_COOKIE_NAME)?.value || DEFAULT_APP_THEME);
  const actor = await getCurrentActor();
  const isAdmin = actor ? isAdminRole(actor.role) : false;
  const restriction = actor ? { restricted: false, reason: "" } : await getAccessRestriction();
  const navItems = actor
    ? [
        ...(isAdmin ? [{ href: "/user", label: appI18n.dictionary.navigation.personal_hub }] : []),
        { href: "/dashboard", label: appI18n.dictionary.navigation.dashboard },
        { href: "/resume", label: appI18n.dictionary.navigation.sample_cv },
        { href: "/docs", label: appI18n.dictionary.navigation.docs },
      ]
    : [
        {
          href: "/login?mode=signup",
          label: appI18n.dictionary.navigation.sign_up,
          emphasis: "primary" as const,
          disabled: restriction.restricted,
          disabledReason: restriction.reason,
        },
        {
          href: "/login?mode=signin",
          label: appI18n.dictionary.navigation.sign_in,
          emphasis: "secondary" as const,
          disabled: restriction.restricted,
          disabledReason: restriction.reason,
        },
      ];

  return (
    <html lang={appI18n.locale} data-app-theme={initialTheme} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body data-app-theme={initialTheme}>
        <AppI18nProvider value={appI18n}>
          <header className="app-header">
            <div className="app-shell app-header__inner">
              <div className="app-header__branding">
                <AppBrand />
                <AppLanguageMenu />
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
        </AppI18nProvider>
      </body>
    </html>
  );
}
