import { apiBaseUrl } from "@/lib/config";

export class ApiClientError extends Error {
  status: number;
  statusText: string;
  body: unknown;

  constructor(message: string, response: Response, body: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.body = body;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function buildApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseBody = await readResponseBody(response);
  if (!response.ok) {
    throw new ApiClientError(`API request failed (${response.status})`, response, responseBody);
  }

  return responseBody as T;
}
