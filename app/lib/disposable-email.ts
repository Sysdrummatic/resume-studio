const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DisposableResponse = {
  disposable?: boolean;
};

export function isValidEmailAddress(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export async function isDisposableEmailAddress(email: string): Promise<boolean> {
  const baseUrl = process.env.DISPOSABLE_EMAIL_CHECK_URL || "https://www.disify.com/api/email";
  const timeoutMs = Number.parseInt(process.env.DISPOSABLE_EMAIL_TIMEOUT_MS || "4500", 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 4500);

  try {
    const response = await fetch(`${baseUrl}/${encodeURIComponent(email)}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as DisposableResponse;
    return Boolean(payload.disposable);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
