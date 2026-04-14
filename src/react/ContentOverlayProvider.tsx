"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "content-overlay-edit-mode";

interface ContentOverlayContextType {
  isAdmin: boolean;
  isEditMode: boolean;
  isCheckingAdmin: boolean;
  unpublishedCount: number;
  isPublishing: boolean;
  pendingCount: number;
  /** Published content map, passed from the server for SSR. */
  initialContent: Record<string, string>;
  /** Base URL for CMS API endpoints. */
  basePath: string;
  toggleEditMode: () => void;
  refreshStatus: () => Promise<void>;
  publishAllDrafts: () => Promise<{ publishedCount: number }>;
  setPendingChange: (key: string, value: string) => void;
  clearPendingChange: (key: string) => void;
  clearAllPendingChanges: () => void;
}

const ContentOverlayContext = createContext<ContentOverlayContextType | undefined>(undefined);

interface ContentOverlayProviderProps {
  children: ReactNode;
  /** Published content map from getContent() for SSR. */
  initialContent?: Record<string, string>;
  /** Base path for the CMS API routes. Default: "/api/content-overlay" */
  basePath?: string;
  /** Keyboard shortcut to toggle edit mode. Default: "ctrl+shift+e" */
  shortcut?: string;
}

// Login modal styles
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};
const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  padding: "24px",
  width: "320px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  fontSize: "14px",
  marginTop: "8px",
  boxSizing: "border-box",
};
const submitStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "#2D6A4F",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "12px",
};

export function ContentOverlayProvider({
  children,
  initialContent = {},
  basePath = "/api/content-overlay",
  shortcut = "ctrl+shift+e",
}: ContentOverlayProviderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [unpublishedCount, setUnpublishedCount] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [showLogin, setShowLogin] = useState(false);
  const [loginSecret, setLoginSecret] = useState("");
  const [loginError, setLoginError] = useState("");

  const refreshStatus = useCallback(async () => {
    setIsCheckingAdmin(true);
    try {
      const response = await fetch(`${basePath}/me`, { cache: "no-store" });
      const data = (await response.json()) as { isAdmin?: boolean; unpublishedCount?: number };
      const nextIsAdmin = !!data.isAdmin;

      setIsAdmin(nextIsAdmin);
      setUnpublishedCount(nextIsAdmin ? Math.max(0, data.unpublishedCount || 0) : 0);

      if (nextIsAdmin) {
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        setIsEditMode(stored === "1");
      } else {
        setIsEditMode(false);
      }
    } catch {
      setIsAdmin(false);
      setUnpublishedCount(0);
      setIsEditMode(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  }, [basePath]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const toggleEditMode = useCallback(() => {
    if (!isAdmin) {
      // Not admin — show login if secret-based auth is configured
      setShowLogin(true);
      return;
    }
    setIsEditMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, [isAdmin]);

  // Keyboard shortcut
  useEffect(() => {
    const parts = shortcut.toLowerCase().split("+").map((p) => p.trim());
    const needsCtrl = parts.includes("ctrl");
    const needsShift = parts.includes("shift");
    const needsMeta = parts.includes("meta");
    const key = parts.find((p) => !["ctrl", "shift", "meta", "alt"].includes(p)) ?? "e";

    const onKeyDown = (event: KeyboardEvent) => {
      if (needsCtrl && !event.ctrlKey && !event.metaKey) return;
      if (needsShift && !event.shiftKey) return;
      if (needsMeta && !event.metaKey) return;
      if (event.key.toLowerCase() !== key) return;
      event.preventDefault();
      toggleEditMode();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggleEditMode]);

  const handleLogin = useCallback(async () => {
    setLoginError("");
    try {
      const response = await fetch(`${basePath}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: loginSecret }),
      });
      if (!response.ok) {
        setLoginError("Invalid secret");
        return;
      }
      setShowLogin(false);
      setLoginSecret("");
      await refreshStatus();
      // Auto-enable edit mode after successful login
      setIsEditMode(true);
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      setLoginError("Login failed");
    }
  }, [basePath, loginSecret, refreshStatus]);

  const setPendingChange = useCallback((key: string, val: string) => {
    setPendingChanges((prev) => ({ ...prev, [key]: val }));
  }, []);

  const clearPendingChange = useCallback((key: string) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllPendingChanges = useCallback(() => {
    setPendingChanges({});
  }, []);

  const publishAllDrafts = useCallback(async () => {
    if (!isAdmin) throw new Error("Only admins can publish.");
    setIsPublishing(true);
    try {
      const response = await fetch(`${basePath}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = (await response.json()) as { error?: string; publishedCount?: number };
      if (!response.ok) throw new Error(data.error || "Publish failed");
      await refreshStatus();
      return { publishedCount: data.publishedCount || 0 };
    } finally {
      setIsPublishing(false);
    }
  }, [isAdmin, basePath, refreshStatus]);

  const value = useMemo<ContentOverlayContextType>(
    () => ({
      isAdmin,
      isEditMode,
      isCheckingAdmin,
      unpublishedCount,
      isPublishing,
      pendingCount: Object.keys(pendingChanges).length,
      initialContent,
      basePath,
      toggleEditMode,
      refreshStatus,
      publishAllDrafts,
      setPendingChange,
      clearPendingChange,
      clearAllPendingChanges,
    }),
    [
      isAdmin,
      isEditMode,
      isCheckingAdmin,
      unpublishedCount,
      isPublishing,
      pendingChanges,
      initialContent,
      basePath,
      toggleEditMode,
      refreshStatus,
      publishAllDrafts,
      setPendingChange,
      clearPendingChange,
      clearAllPendingChanges,
    ]
  );

  return (
    <ContentOverlayContext.Provider value={value}>
      {children}
      {showLogin && (
        <div style={overlayStyle} onClick={() => setShowLogin(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700 }}>
              Content Overlay
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
              Enter your secret to enable editing.
            </p>
            <input
              type="password"
              value={loginSecret}
              onChange={(e) => setLoginSecret(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              placeholder="Secret"
              style={inputStyle}
              autoFocus
            />
            {loginError && (
              <p style={{ color: "#dc2626", fontSize: "13px", margin: "8px 0 0 0" }}>
                {loginError}
              </p>
            )}
            <button type="button" onClick={handleLogin} style={submitStyle}>
              Unlock
            </button>
          </div>
        </div>
      )}
    </ContentOverlayContext.Provider>
  );
}

export function useContentOverlay(): ContentOverlayContextType {
  const context = useContext(ContentOverlayContext);
  if (!context) {
    throw new Error("useContentOverlay must be used within a ContentOverlayProvider");
  }
  return context;
}
