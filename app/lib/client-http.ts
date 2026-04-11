export type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

const DEFAULT_NETWORK_ERROR = "Unable to reach server. Check your connection and try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePayload(payload: unknown): ApiResponse {
  if (!isRecord(payload)) {
    return {};
  }

  return {
    ok: typeof payload.ok === "boolean" ? payload.ok : undefined,
    error: typeof payload.error === "string" ? payload.error : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
  };
}

export async function postJson(
  url: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResponse> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let parsedPayload: ApiResponse = {};

    if (responseText) {
      try {
        parsedPayload = normalizePayload(JSON.parse(responseText));
      } catch {
        parsedPayload = {};
      }
    }

    if (!response.ok) {
      return {
        ...parsedPayload,
        error: parsedPayload.error || `Request failed (${response.status}). Try again.`,
      };
    }

    return parsedPayload;
  } catch {
    return { error: DEFAULT_NETWORK_ERROR };
  }
}
