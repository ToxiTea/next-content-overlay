"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
import { useContentOverlay } from "./ContentOverlayProvider.js";
import { EditorToolbar } from "./EditorToolbar.js";
import type { HistoryEntry } from "../types.js";

interface EditableProps {
  /** Unique content key (e.g., "hero.title") */
  k: string;
  /** HTML tag to render. Default: "span" */
  as?: ElementType;
  /** CSS class name (applies only in view mode) */
  className?: string;
  /** Enable multiline editing (textarea grows with content) */
  multiline?: boolean;
  /** Maximum character limit. Default: 20000 */
  maxLength?: number;
  /** Show delete button in edit mode */
  deletable?: boolean;
  /** Default value — the children of the component */
  children: string;
}

// --- Styles ---

const wrapperStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #2D6A4F",
  background: "#fff",
  color: "#0a0a0a",
  fontSize: "inherit",
  fontFamily: "inherit",
  fontWeight: "inherit",
  lineHeight: "inherit",
  resize: "none",
  overflow: "hidden",
  boxSizing: "border-box",
  outline: "none",
};

const hoverOutline: React.CSSProperties = {
  outline: "1px solid rgba(45, 106, 79, 0.5)",
  borderRadius: "4px",
  cursor: "text",
};

const historyBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const historyEntryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "8px 12px",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "6px",
  fontSize: "13px",
};

const deleteBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#dc2626",
  background: "transparent",
  border: "none",
  padding: "4px 8px",
  cursor: "pointer",
};

const confirmBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#b91c1c",
  background: "#fee2e2",
  border: "none",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
};

// --- Helpers ---

function renderDisplay(text: string): React.ReactNode {
  const hasBold = text.includes("**");
  const hasNewline = text.includes("\n");
  if (!hasBold && !hasNewline) return text;

  const normalized = hasBold
    ? text.replace(/\*\*([^*]*?)\n\s*\*\*/g, "**$1**\n")
    : text;

  const boldParts = hasBold ? normalized.split(/(\*\*[^*]+\*\*)/g) : [normalized];
  const nodes: React.ReactNode[] = [];

  boldParts.forEach((part, i) => {
    const isBold = part.startsWith("**") && part.endsWith("**");
    const inner = isBold ? part.slice(2, -2) : part;

    const lines = inner.split("\n");
    const lineNodes: React.ReactNode[] = [];
    lines.forEach((line, li) => {
      if (li > 0) lineNodes.push(<br key={`br-${i}-${li}`} />);
      if (line) lineNodes.push(line);
    });

    if (isBold) {
      nodes.push(<strong key={i}>{lineNodes}</strong>);
    } else {
      nodes.push(<React.Fragment key={i}>{lineNodes}</React.Fragment>);
    }
  });

  return <>{nodes}</>;
}

// --- Component ---

export function Editable({
  k,
  as,
  className = "",
  multiline = false,
  maxLength = 20000,
  deletable = false,
  children,
}: EditableProps) {
  const Tag = (as ?? "span") as ElementType;
  const defaultValue = children;

  const {
    isAdmin,
    isEditMode,
    basePath,
    initialContent,
    refreshStatus,
    setPendingChange,
    clearPendingChange,
  } = useContentOverlay();

  // Start with initial content from provider, fall back to default
  const initial = initialContent[k] ?? defaultValue;

  const [value, setValue] = useState(initial);
  const [originalValue, setOriginalValue] = useState(initial);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasDraftValue = useRef(false);

  // Hydrate draft when entering edit mode
  useEffect(() => {
    if (!isAdmin || !isEditMode || isEditing) return;

    let cancelled = false;
    fetch(`${basePath}/content?keys=${encodeURIComponent(k)}&includeDraft=1`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((payload: { content?: Record<string, string>; versions?: Record<string, number> }) => {
        if (cancelled) return;
        const draftValue = payload.content?.[k];
        const version = payload.versions?.[k];
        if (draftValue !== undefined) {
          setValue(draftValue);
          setOriginalValue(draftValue);
          setCurrentVersion(version ?? null);
          hasDraftValue.current = true;
        }
      })
      .catch(() => { /* silent */ });

    return () => { cancelled = true; };
  }, [k, basePath, isAdmin, isEditMode, isEditing]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
      autoResize();
    }
  }, [isEditing, autoResize]);

  // Track pending changes
  useEffect(() => {
    if (!isAdmin || !isEditMode) {
      clearPendingChange(k);
      return;
    }
    if (value !== originalValue) {
      setPendingChange(k, value);
    } else {
      clearPendingChange(k);
    }
  }, [k, value, originalValue, isAdmin, isEditMode, setPendingChange, clearPendingChange]);

  const beginEditing = useCallback(() => {
    if (!isAdmin || !isEditMode) return;
    setError(null);
    setIsEditing(true);
  }, [isAdmin, isEditMode]);

  const cancelEditing = useCallback(() => {
    setValue(originalValue);
    setError(null);
    setIsHistoryOpen(false);
    setConfirmingDelete(false);
    setIsEditing(false);
  }, [originalValue]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const r = await fetch(
        `${basePath}/history?key=${encodeURIComponent(k)}&limit=20`,
        { cache: "no-store" }
      );
      const payload = (await r.json()) as { error?: string; entries?: HistoryEntry[] };
      if (!r.ok) throw new Error(payload.error || "Failed to load history");
      setHistory(payload.entries || []);
    } catch {
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [k, basePath]);

  const toggleHistory = useCallback(async () => {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      return;
    }
    setIsHistoryOpen(true);
    await loadHistory();
  }, [isHistoryOpen, loadHistory]);

  const restoreVersion = useCallback(
    async (version: number) => {
      if (isRestoringVersion !== null) return;
      setIsRestoringVersion(version);
      setError(null);
      try {
        const r = await fetch(`${basePath}/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: k, version }),
        });
        const payload = (await r.json()) as { error?: string; draftValue?: string; version?: number };
        if (!r.ok) throw new Error(payload.error || "Restore failed");
        const restored = payload.draftValue ?? value;
        setValue(restored);
        setOriginalValue(restored);
        setCurrentVersion(payload.version ?? null);
        await loadHistory();
        await refreshStatus();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Restore failed");
      } finally {
        setIsRestoringVersion(null);
      }
    },
    [k, basePath, isRestoringVersion, loadHistory, refreshStatus, value]
  );

  const saveDraft = useCallback(async () => {
    if (!isAdmin || !isEditMode || isSaving) return;
    if (value.length > maxLength) {
      setError(`Text is too long (max ${maxLength} characters).`);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const r = await fetch(`${basePath}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k, value, baseValue: defaultValue }),
      });
      const payload = (await r.json()) as { error?: string; draftValue?: string; version?: number };
      if (!r.ok) throw new Error(payload.error || "Save failed");
      const saved = payload.draftValue ?? value;
      setOriginalValue(saved);
      setValue(saved);
      hasDraftValue.current = true;
      if (typeof payload.version === "number") setCurrentVersion(payload.version);
      setIsEditing(false);
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [k, basePath, defaultValue, isAdmin, isEditMode, isSaving, maxLength, refreshStatus, value]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!isAdmin || !isEditMode || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      // Save empty draft
      const saveR = await fetch(`${basePath}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k, value: "", baseValue: defaultValue }),
      });
      if (!saveR.ok) {
        const payload = (await saveR.json()) as { error?: string };
        throw new Error(payload.error || "Delete failed");
      }
      // Publish immediately
      const pubR = await fetch(`${basePath}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [k] }),
      });
      if (!pubR.ok) {
        const payload = (await pubR.json()) as { error?: string };
        throw new Error(payload.error || "Publish failed");
      }
      setValue("");
      setOriginalValue("");
      setIsEditing(false);
      setIsDeleted(true);
      setConfirmingDelete(false);
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setConfirmingDelete(false);
    } finally {
      setIsSaving(false);
    }
  }, [k, basePath, defaultValue, isAdmin, isEditMode, isSaving, refreshStatus]);

  // Ctrl+B bold shortcut
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = ta.value;

      if (start === end) {
        const before = text.slice(0, start);
        const after = text.slice(start);
        const insideBold = before.endsWith("**") && after.startsWith("**");
        if (insideBold) {
          const newValue = text.slice(0, start - 2) + text.slice(start + 2);
          setValue(newValue);
          requestAnimationFrame(() => ta.setSelectionRange(start - 2, start - 2));
        } else {
          const newValue = before + "****" + after;
          setValue(newValue);
          requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
        }
        return;
      }

      const selected = text.slice(start, end);
      const isBold = selected.startsWith("**") && selected.endsWith("**") && selected.length > 4;
      const replacement = isBold ? selected.slice(2, -2) : `**${selected}**`;
      const newValue = text.slice(0, start) + replacement + text.slice(end);
      setValue(newValue);
      requestAnimationFrame(() => {
        if (isBold) {
          ta.setSelectionRange(start, start + replacement.length);
        } else {
          ta.setSelectionRange(start + 2, end + 2);
        }
      });
    }
  }, []);

  // --- Render ---

  if (isDeleted) return null;

  // View mode (non-admin or edit mode off)
  if (!isAdmin || !isEditMode) {
    if (!value) return null;
    return <Tag className={className}>{renderDisplay(value)}</Tag>;
  }

  // Edit mode, not editing yet
  if (!isEditing) {
    return (
      <Tag
        className={className}
        style={isHovering ? hoverOutline : { cursor: "text" }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={beginEditing}
      >
        {value ? (
          renderDisplay(value)
        ) : (
          <span style={{ color: "#999", fontStyle: "italic" }}>Click to edit…</span>
        )}
      </Tag>
    );
  }

  // Editing UI
  return (
    <div style={wrapperStyle}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        onInput={autoResize}
        rows={1}
        maxLength={maxLength}
        style={{
          ...textareaStyle,
          minHeight: multiline ? "120px" : "42px",
        }}
      />

      {error && (
        <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>{error}</p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <EditorToolbar
          canSave={value !== originalValue && !isSaving}
          isSaving={isSaving}
          isHistoryDisabled={isLoadingHistory || isRestoringVersion !== null}
          onHistory={toggleHistory}
          onSave={saveDraft}
          onCancel={cancelEditing}
        />
        {deletable && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={isSaving}
            style={{ ...deleteBtnStyle, marginLeft: "auto" }}
          >
            Delete
          </button>
        )}
        {deletable && confirmingDelete && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#dc2626" }}>Sure?</span>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isSaving}
              style={confirmBtnStyle}
            >
              {isSaving ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={isSaving}
              style={{ fontSize: "12px", color: "#666", background: "transparent", border: "none", cursor: "pointer" }}
            >
              No
            </button>
          </span>
        )}
      </div>

      {isHistoryOpen && (
        <div style={historyBoxStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666", margin: 0 }}>
              Version History
            </p>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              style={{ fontSize: "12px", color: "#666", background: "transparent", border: "none", cursor: "pointer" }}
            >
              Close
            </button>
          </div>

          {isLoadingHistory && (
            <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>Loading...</p>
          )}

          {!isLoadingHistory && history.length === 0 && (
            <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>No saved versions yet.</p>
          )}

          {!isLoadingHistory &&
            history.map((entry) => (
              <div key={`${entry.version}-${entry.changedAt}`} style={historyEntryStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0a0a0a", margin: 0 }}>
                    v{entry.version} — {entry.changeType.replace("_", " ")}
                  </p>
                  <p style={{ fontSize: "11px", color: "#999", margin: 0 }}>
                    {new Date(entry.changedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restoreVersion(entry.version)}
                  disabled={isRestoringVersion !== null}
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#2D6A4F",
                    background: "transparent",
                    border: "none",
                    cursor: isRestoringVersion !== null ? "not-allowed" : "pointer",
                    opacity: isRestoringVersion !== null ? 0.5 : 1,
                  }}
                >
                  {isRestoringVersion === entry.version ? "Restoring..." : "Restore"}
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
