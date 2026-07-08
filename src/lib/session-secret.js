// Shared between src/lib/auth.js (Node runtime) and src/middleware.js (Edge
// runtime) — keep this file free of Node-only APIs.

export function getSessionSecretKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SESSION_SECRET environment variable must be set in production. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
    return new TextEncoder().encode('daily-pulse-dev-secret-key-change-in-prod');
  }

  return new TextEncoder().encode(secret);
}
