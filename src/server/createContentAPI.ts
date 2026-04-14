import { ContentStorage } from "./storage.js";
import { defaultAdminCheck, buildTokenCookie } from "./auth.js";
import { sanitizeText } from "../lib/sanitize.js";
import type { ContentAPIOptions, StorageAdapter } from "../types.js";

type RouteContext = { params: Promise<{ action: string[] }> };

/**
 * Factory that creates a single request handler for all CMS API operations.
 *
 * Mount at: app/api/content-overlay/[...action]/route.ts
 *
 * ```ts
 * import { createContentAPI } from 'next-content-overlay/server';
 * const handler = createContentAPI();
 * export const GET = handler;
 * export const POST = handler;
 * ```
 */
export function createContentAPI(options: ContentAPIOptions = {}) {
  const storage: StorageAdapter =
    options.storage ?? new ContentStorage(options.contentDir ?? process.cwd());
  const checkAdmin = options.isAdmin ?? defaultAdminCheck;

  return async function handler(
    request: Request,
    context: RouteContext
  ): Promise<Response> {
    const { action } = await context.params;
    const route = action.join("/");

    try {
      switch (route) {
        case "me":
          return handleMe(request, checkAdmin, storage);
        case "content":
          return handleContent(request, checkAdmin, storage);
        case "save":
          return handleSave(request, checkAdmin, storage);
        case "publish":
          return handlePublish(request, checkAdmin, storage);
        case "history":
          return handleHistory(request, checkAdmin, storage);
        case "restore":
          return handleRestore(request, checkAdmin, storage);
        case "login":
          return handleLogin(request);
        default:
          return json({ error: "Not found" }, 404);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return json({ error: message }, 500);
    }
  };
}

// --- Sub-handlers ---

type AdminCheck = (request: Request) => Promise<boolean> | boolean;

async function handleMe(
  request: Request,
  checkAdmin: AdminCheck,
  storage: StorageAdapter
): Promise<Response> {
  const isAdmin = await checkAdmin(request);
  if (!isAdmin) {
    return json({ isAdmin: false, unpublishedCount: 0 });
  }
  const unpublishedCount = await storage.getUnpublishedCount();
  return json({ isAdmin: true, unpublishedCount });
}

async function handleContent(
  request: Request,
  checkAdmin: AdminCheck,
  storage: StorageAdapter
): Promise<Response> {
  const url = new URL(request.url);
  const keysParam = url.searchParams.get("keys");
  const includeDraft = url.searchParams.get("includeDraft") === "1";

  if (!keysParam) {
    return json({ error: "Missing keys parameter" }, 400);
  }

  const keys = keysParam.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    return json({ error: "No keys provided" }, 400);
  }

  // Only include drafts for admins
  const isAdmin = includeDraft ? await checkAdmin(request) : false;
  const result = await storage.getContent(keys, isAdmin && includeDraft);
  return json(result);
}

async function handleSave(
  request: Request,
  checkAdmin: AdminCheck,
  storage: StorageAdapter
): Promise<Response> {
  const isAdmin = await checkAdmin(request);
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await request.json() as { key?: string; value?: string; baseValue?: string };
  const { key, value, baseValue } = body;

  if (!key || typeof key !== "string") {
    return json({ error: "Missing or invalid key" }, 400);
  }
  if (value === undefined || typeof value !== "string") {
    return json({ error: "Missing or invalid value" }, 400);
  }

  const result = await storage.saveDraft(key, value, baseValue);
  return json({ success: true, draftValue: sanitizeText(value), version: result.version });
}

async function handlePublish(
  request: Request,
  checkAdmin: AdminCheck,
  storage: StorageAdapter
): Promise<Response> {
  const isAdmin = await checkAdmin(request);
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await request.json() as { keys?: string[]; all?: boolean };
  const keys = body.all ? undefined : body.keys;

  if (!body.all && (!keys || keys.length === 0)) {
    return json({ error: "Provide keys array or set all: true" }, 400);
  }

  const result = await storage.publish(keys);
  return json({ success: true, ...result });
}

async function handleHistory(
  request: Request,
  checkAdmin: AdminCheck,
  storage: StorageAdapter
): Promise<Response> {
  const isAdmin = await checkAdmin(request);
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const limitParam = url.searchParams.get("limit");

  if (!key) {
    return json({ error: "Missing key parameter" }, 400);
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 25;
  const entries = await storage.getHistory(key, limit);
  return json({ key, entries });
}

async function handleRestore(
  request: Request,
  checkAdmin: AdminCheck,
  storage: StorageAdapter
): Promise<Response> {
  const isAdmin = await checkAdmin(request);
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await request.json() as { key?: string; version?: number };
  const { key, version } = body;

  if (!key || typeof key !== "string") {
    return json({ error: "Missing or invalid key" }, 400);
  }
  if (version === undefined || typeof version !== "number") {
    return json({ error: "Missing or invalid version" }, 400);
  }

  const result = await storage.restoreVersion(key, version);
  return json({ success: true, key, draftValue: result.value, version: result.version });
}

async function handleLogin(request: Request): Promise<Response> {
  const secret = process.env.CONTENT_OVERLAY_SECRET;

  if (!secret) {
    // No secret configured — dev mode is always admin
    return json({ success: true, message: "No secret configured, dev mode active" });
  }

  const body = await request.json() as { secret?: string };
  if (body.secret !== secret) {
    return json({ error: "Invalid secret" }, 401);
  }

  const response = json({ success: true });
  response.headers.set("Set-Cookie", buildTokenCookie(secret));
  return response;
}

// --- Utility ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
