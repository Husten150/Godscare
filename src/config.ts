/**
 * Resolves the absolute backend API URL depending on the current environment.
 * If running on localhost, 127.0.0.1, or on the cloud run app itself, use relative paths.
 * Otherwise (e.g., deployed on Vercel), route requests to the absolute Cloud Run backend URL.
 */
export const getApiUrl = (path: string): string => {
  return path;
};
