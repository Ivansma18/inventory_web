const backendApiPrefix = "/api/backend";
const backendApiPrefixPattern = /^\/api\/backend(?=\/|$)/;

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
  },
  "^/api/backend(?:/|\\?|$)": {
    target,
    changeOrigin: true,
    rewrite: rewriteBusinessApiPath,
  },
});
