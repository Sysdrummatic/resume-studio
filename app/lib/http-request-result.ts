type ResponseErrorPayload = {
  message?: string;
  msg?: string;
  error_description?: string;
  error?: string;
};

type RequestJsonResultOptions = {
  networkErrorMessage: string;
  httpErrorFallback: string;
  networkErrorStatus?: number;
};

export type RequestJsonResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

function toErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const errorPayload = payload as ResponseErrorPayload;
  return (
    errorPayload.message || errorPayload.msg || errorPayload.error_description || errorPayload.error || fallback
  );
}

async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestJsonResult<T>(
  executeRequest: () => Promise<Response>,
  options: RequestJsonResultOptions,
): Promise<RequestJsonResult<T>> {
  let response: Response;
  try {
    response = await executeRequest();
  } catch {
    return {
      data: null,
      error: options.networkErrorMessage,
      status: options.networkErrorStatus ?? 503,
    };
  }

  const payload = await parseResponseBody(response);
  if (!response.ok) {
    return {
      data: null,
      error: toErrorMessage(payload, options.httpErrorFallback),
      status: response.status,
    };
  }

  return {
    data: payload as T,
    error: null,
    status: response.status,
  };
}
