const COUNTRY_HEADER_NAME = "x-opencivera-country-code";

function isHtmlRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

export default async function appLocale(request, context) {
  const countryCode = String(context.geo?.country?.code || "").trim().toUpperCase();
  if (!countryCode || !isHtmlRequest(request)) {
    return;
  }

  const headers = new Headers(request.headers);
  headers.set(COUNTRY_HEADER_NAME, countryCode);
  return context.next(new Request(request, { headers }));
}

export const config = {
  path: "/*",
  excludedPath: ["/_next/*", "/api/*", "/*.css", "/*.js", "/*.map", "/*.svg", "/*.png", "/*.jpg", "/*.jpeg", "/*.webp", "/*.woff", "/*.woff2", "/*.ttf"],
  method: "GET",
  onError: "bypass",
};
