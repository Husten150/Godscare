/**
 * Resolves the absolute backend API URL depending on the current environment.
 * If running on localhost, 127.0.0.1, or on the cloud run app itself, use relative paths.
 * Otherwise (e.g., deployed on Vercel), route requests to the absolute Cloud Run backend URL.
 */
export const getApiUrl = (path: string): string => {
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("run.app") ||
    hostname.includes("vercel.app") ||
    hostname.includes("vercel")
  ) {
    return path;
  }
  // Target active Cloud Run dev container as the backend service
  const base = "https://ais-dev-2djaao225qtzufpsfgx4z7-143923848108.europe-west3.run.app";
  return `${base}${path}`;
};
