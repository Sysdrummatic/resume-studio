import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveAuthMode } from "../app/lib/auth-mode.ts";

const stylesPath = path.join(process.cwd(), "app", "globals.css");
const loginPagePath = path.join(process.cwd(), "app", "login", "page.tsx");
const loginClientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");

function readStyles() {
  return fs.readFileSync(stylesPath, "utf8");
}

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"));
  return match?.[1] || "";
}

test("login access container uses a stable responsive width", () => {
  const styles = readStyles();
  const rule = extractRule(styles, ".app-main .auth-access");

  assert.equal(rule.includes("width: fit-content"), false);
  assert.equal(rule.includes("left: 50%"), false);
  assert.equal(rule.includes("translateX(-50%)"), false);
  assert.equal(rule.includes("width: min(460px, 100%)"), true);
  assert.equal(rule.includes("margin-inline: auto"), true);
});

test("login card fills the access container instead of shrinking to content", () => {
  const styles = readStyles();
  const cardRule = styles.match(/\.auth-access__card\s*\{([^}]*)\}/m)?.[1] || "";

  assert.equal(cardRule.includes("min-width: 0"), true);
  assert.equal(cardRule.includes("width: 100%"), true);
  assert.equal(styles.includes(".auth-access {\n    grid-template-columns: minmax(0, 1.05fr)"), false);
});

test("resolveAuthMode: one valid mode is kept; missing, unknown or repeated means sign in", () => {
  for (const mode of ["signin", "signup", "reset"]) {
    assert.equal(resolveAuthMode(mode), mode);
    assert.equal(resolveAuthMode([mode]), mode, "URLSearchParams.getAll with a single value");
  }
  for (const value of [undefined, null, "", "bogus", [], ["bogus"], ["signup", "signin"], ["signin", "signup"], ["signup", "signup"]]) {
    assert.equal(resolveAuthMode(value), "signin", JSON.stringify(value));
  }
});

test("login flow uses separate modes for sign in, sign up, and reset", () => {
  const page = readSource(loginPagePath);
  const client = readSource(loginClientPath);

  // Next passes a repeated ?mode= as an array.
  assert.equal(page.includes("mode?: string | string[];"), true);
  // Shared with the top bar, which marks the current Sign in / Sign up link by the same rule.
  assert.equal(page.includes('import { resolveAuthMode } from "../lib/auth-mode";'), true);
  assert.equal(fs.readFileSync(path.join(process.cwd(), "app/lib/auth-mode.ts"), "utf8").includes("export function resolveAuthMode"), true);
  assert.equal(page.includes("mode={resolveAuthMode(params.mode)}"), true);
  assert.equal(client.includes('type InitialAuthMode = "signin" | "signup" | "reset";'), true);
  assert.equal(client.includes('type AuthMode = InitialAuthMode | "new-password";'), true);
  assert.equal(client.includes("auth-card__tabs"), false);
  assert.equal(client.includes("auth.actions.forgot_password"), true);
  assert.equal(client.includes('router.replace(`/login?mode=${nextMode}`, { scroll: false });'), true);
  assert.equal(client.includes('setMode("signin");'), true);
});

test("signup requires accepting the privacy policy before account creation is enabled", () => {
  const client = readSource(loginClientPath);

  assert.equal(client.includes("const [signupPolicyAccepted, setSignupPolicyAccepted] = useState(false);"), true);
  assert.match(client, /type="checkbox"\s*\n\s*checked={signupPolicyAccepted}/);
  assert.match(client, /disabled={isBusy \|\| !signupPolicyAccepted}/);
});

test("recovery-hash detection is race-proof against React Strict Mode's double-invoked mount effects", () => {
  const client = readSource(loginClientPath);

  // React 18 dev/Strict Mode re-runs mount effects with the closure from the
  // *first* pass (recoveryToken still ""), so the mode-reset effect must not
  // rely on that state alone - it re-fires setActiveMode(mode) after the hash
  // effect already switched to "new-password", clobbering it back to signin.
  // A ref read live on every invocation (not captured per-closure) closes the
  // race; regression: clicking a valid recovery link in `npm run dev` landed
  // on the plain sign-in form instead of the reset-password form.
  assert.equal(client.includes("const recoveryHashDetected = useRef(false);"), true);
  assert.match(client, /useEffect\(\(\) => \{\s*if \(!recoveryHashDetected\.current && !recoveryToken\) \{\s*setActiveMode\(mode\);/);
  assert.equal(client.includes("recoveryHashDetected.current = true;"), true);
});

test("an expired or already-used recovery link surfaces an error instead of silently showing sign-in", () => {
  const client = readSource(loginClientPath);

  assert.equal(client.includes('if (hashParams.get("error")) {'), true);
  assert.equal(client.includes('setActiveMode("reset");'), true);
  assert.equal(
    client.includes('hashParams.get("error_description") || "This password reset link is invalid or has expired. Request a new one below."'),
    true,
  );
});

test("login shows loose floating sheets behind an h1, presentation only (#290)", () => {
  const page = readSource(loginPagePath);
  assert.match(page, /<FloatingSheets cv=\{cv\} \/>/);
  assert.match(page, /<h1 className=\{styles\.title\}>\{entry\.title\}<\/h1>/);
  assert.match(page, /<AccountAccessClient\b/);
  const sheets = readSource(path.join(process.cwd(), "app", "components", "landing", "floating-sheets.tsx"));
  assert.match(sheets, /aria-hidden="true"/);
  assert.match(sheets, /visibilitychange/);
  assert.match(sheets, /const COUNT = 10;/, "the mockup's ten loose sheets");
  /* the sample CV only decorates the sheets: failing to read it must never take /login down */
  assert.match(page, /loadSampleResumeData\(\)\.catch\(\(\) => null\)/);
  assert.match(sheets, /cv: SceneCv \| null/);
});

test("the auth card looks like the mockup's panel, on LiveCV tokens, with AccountAccessClient untouched (#290)", () => {
  const css = readSource(path.join(process.cwd(), "app", "login", "login.module.css"));
  const rule = (selector) => extractRule(css, selector);
  assert.doesNotMatch(css, /--portal-/, "no legacy palette on /login");
  const card = rule(".entry :global(.auth-card)");
  assert.match(card, /background: var\(--ocv-raise\)/);
  assert.match(card, /border: 1px solid var\(--ocv-line-strong\)/);
  assert.match(card, /border-radius: 20px/);
  assert.match(rule(".entry :global(.auth-card)::before"), /animation: card-trace/, "traced once round the panel, as in the mockup");
  assert.match(rule(".entry :global(.auth-card__title)"), /var\(--ocv-font-display\)/);
  assert.match(rule(".entry :global(.product-surface__eyebrow)"), /color: var\(--ocv-ink-3\)/);
  const input = rule(".entry :global(.auth-card input:not([type=\"checkbox\"]))");
  assert.match(input, /border: 1px solid var\(--ocv-control\)/);
  assert.match(input, /border-radius: 12px/);
  assert.match(input, /min-height: var\(--ocv-hit\)/);
  const primary = rule(".entry :global(.auth-card .button--primary)");
  assert.match(primary, /background: var\(--ocv-ink\)/);
  assert.match(rule(".entry :global(.auth-card .button)"), /border-radius: var\(--ocv-radius-pill\)/);
  assert.match(rule(".entry :global(.auth-card__support-row)"), /order: 1/, "'Forgot password?' sits under the button");
});

test("the copy beside the card stays put when the card changes height (sign in <-> sign up)", () => {
  const css = readSource(path.join(process.cwd(), "app", "login", "login.module.css"));
  /* sticky inside the grid row followed the card's height: the headline jumped when switching forms */
  assert.doesNotMatch(css, /position: sticky/);
  assert.match(css, /\.copy \{\s*margin-top: clamp\(/);
});
