/**
 * Curated, non-exhaustive list of throwaway-mail domains. Replaces the Disify
 * HTTP lookup, which sent every signup email address to a third party with no
 * processor assessment. The same list is seeded into
 * `public.disposable_email_domains` (migration 20261105000000) so the Supabase
 * `before_user_created` hook enforces it for direct Auth API calls;
 * `tests/auth-boundary-controls.test.mjs` fails if the two drift.
 */
export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  "10minutemail.com", "10minutemail.net", "burnermail.io", "discard.email", "dispostable.com",
  "dropmail.me", "emailfake.com", "emailondeck.com", "fakeinbox.com", "fakemail.net",
  "getnada.com", "grr.la", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com", "jetable.org", "mail.tm",
  "mailcatch.com", "maildrop.cc", "mailinator.com", "mailnesia.com", "minuteinbox.com",
  "mintemail.com", "moakt.com", "mohmal.com", "mytemp.email", "nada.email",
  "owlymail.com", "sharklasers.com", "spambox.us", "spamgourmet.com", "temp-mail.io",
  "temp-mail.org", "tempinbox.com", "tempmail.com", "tempmailo.com", "tempr.email",
  "throwawaymail.com", "tmpmail.net", "tmpmail.org", "trashmail.com", "trashmail.net",
  "yopmail.com", "yopmail.fr",
  "1secmail.com", "33mail.com", "mail7.io", "mailsac.com", "pokemail.net", "spam4.me",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED = new Set(DISPOSABLE_EMAIL_DOMAINS);

export function isValidEmailAddress(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

// Local lookup only: the address never leaves our infrastructure. Matches the
// domain itself and any subdomain of a listed domain (a.b.mailinator.com).
// Async signature kept for existing callers.
export async function isDisposableEmailAddress(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase();
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (BLOCKED.has(labels.slice(i).join("."))) return true;
  }
  return false;
}
