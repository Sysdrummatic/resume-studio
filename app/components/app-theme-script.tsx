import { APP_THEME_COOKIE_NAME } from "../lib/app-theme";

// Rendered only when no theme cookie is stored. It runs before the first paint, sets
// data-app-theme from the system preference (legacy --portal-* rules and JS readers key
// on the attribute) and keeps following the system until the top-bar switch stores a choice.
const FOLLOW_SYSTEM_THEME = `(()=>{const m=matchMedia("(prefers-color-scheme: light)"),c=${JSON.stringify(
  `${APP_THEME_COOKIE_NAME}=`,
)};const a=()=>{if(document.cookie.split("; ").some((p)=>p.startsWith(c)))return;const t=m.matches?"light":"dark";for(const e of[document.documentElement,document.body]){e.dataset.appTheme=t;e.style.colorScheme=t}};a();m.addEventListener("change",a)})()`;

export default function AppThemeScript({ nonce }: { nonce?: string }) {
  return <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FOLLOW_SYSTEM_THEME }} />;
}
