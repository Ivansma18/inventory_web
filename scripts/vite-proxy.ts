import type { HttpProxy } from "vite";

const backendApiPrefix = "/api/backend";
const backendApiPrefixPattern = /^\/api\/backend(?=\/|$)/;
const proxyUnavailableResponse = JSON.stringify({
  error: {
    code: "PROXY_BACKEND_UNAVAILABLE",
    message: "The backend service is unavailable.",
    source: "proxy",
  },
});

export const sanitizeProxyLogPath = (requestPath: string | undefined): string => {
  if (requestPath && /^\/api\/auth(?:\/|\?|$)/.test(requestPath)) {
    return "/api/auth";
  }

  if (requestPath && /^\/api\/backend(?:\/|\?|$)/.test(requestPath)) {
    return "/api/backend";
  }

  return "/api";
};

const handleProxyError = (proxy: HttpProxy.ProxyServer): void => {
  proxy.on("error", (_error, request, response) => {
    request.url = sanitizeProxyLogPath(request.url);

    if (!("writeHead" in response) || response.headersSent || response.writableEnded) {
      return;
    }

    response.writeHead(502, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(proxyUnavailableResponse);
  });
};

export const rewriteBusinessApiPath = (requestPath: string): string => {
  const queryIndex = requestPath.indexOf("?");
  const pathname = queryIndex === -1 ? requestPath : requestPath.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : requestPath.slice(queryIndex);

  if (!backendApiPrefixPattern.test(pathname)) {
    return requestPath;
  }

  const rewrittenPath = pathname.slice(backendApiPrefix.length) || "/";
  return `${rewrittenPath}${query}`;
};

export const createApiProxy = (target: string) => ({
  "^/api/auth(?:/|\\?|$)": {
    target,
    changeOrigin: true,
    configure: handleProxyError,
  },
  "^/api/backend(?:/|\\?|$)": {
    target,
    changeOrigin: true,
    configure: handleProxyError,
    rewrite: rewriteBusinessApiPath,
  },
});
