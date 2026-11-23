import { APP_THEME_COOKIE_NAME, ENABLED_APP_THEMES } from "../lib/app-theme";

// Rendered only when no valid theme cookie is stored. It runs before the first paint, sets
// data-app-theme from the system preference (legacy --portal-* rules and JS readers key
// on the attribute) and keeps following the system until the top-bar switch stores a choice.
// A cookie counts only with an enabled theme value, the same rule as readStoredAppTheme.
const FOLLOW_SYSTEM_THEME = `(()=>{const m=matchMedia("(prefers-color-scheme: light)"),c=${JSON.stringify(
  `${APP_THEME_COOKIE_NAME}=`,
)},v=${JSON.stringify(ENABLED_APP_THEMES)};const a=()=>{if(document.cookie.split("; ").some((p)=>p.startsWith(c)&&v.includes(p.slice(c.length))))return;const t=m.matches?"light":"dark";for(const e of[document.documentElement,document.body]){e.dataset.appTheme=t;e.style.colorScheme=t}};a();m.addEventListener("change",a)})()`;

export default function AppThemeScript({ nonce }: { nonce?: string }) {
  return <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FOLLOW_SYSTEM_THEME }} />;
}
