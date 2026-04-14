/**
 * Default admin check for content-overlay API routes.
 *
 * Behavior:
 * 1. If CONTENT_OVERLAY_SECRET is not set → allow in development only
 * 2. If CONTENT_OVERLAY_SECRET is set → check cookie match
 */
export function defaultAdminCheck(request: Request): boolean {
  const secret = process.env.CONTENT_OVERLAY_SECRET;

  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)content-overlay-token=([^;]+)/);
  return match?.[1] === secret;
}

/** Build a Set-Cookie header value for the overlay token. */
export function buildTokenCookie(secret: string): string {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  return `content-overlay-token=${secret}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
