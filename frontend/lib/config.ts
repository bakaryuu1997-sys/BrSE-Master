export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/$/, "");

export function getWsBaseUrl() {
  if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
    return apiBaseUrl.replace(/^http/, "ws");
  }

  if (typeof window === "undefined") {
    return apiBaseUrl;
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const normalizedPath = apiBaseUrl.startsWith("/") ? apiBaseUrl : `/${apiBaseUrl}`;
  return `${wsProtocol}//${window.location.host}${normalizedPath}`;
}
