"use client";

import React from "react";

interface EditorToolbarProps {
  canSave: boolean;
  isSaving: boolean;
  isHistoryDisabled?: boolean;
  onHistory?: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid transparent",
  transition: "opacity 0.15s",
};

const btnSave: React.CSSProperties = {
  ...btnBase,
  background: "#2D6A4F",
  color: "#fff",
  border: "1px solid #2D6A4F",
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "#555",
  border: "1px solid #ddd",
};

const btnCancel: React.CSSProperties = {
  ...btnBase,
  background: "#f5f5f5",
  color: "#333",
  border: "1px solid #ddd",
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

export function EditorToolbar({
  canSave,
  isSaving,
  isHistoryDisabled = false,
  onHistory,
  onSave,
  onCancel,
}: EditorToolbarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || isSaving}
        style={{
          ...btnSave,
          ...(!canSave || isSaving ? disabledStyle : {}),
        }}
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
      {onHistory && (
        <button
          type="button"
          onClick={onHistory}
          disabled={isHistoryDisabled || isSaving}
          style={{
            ...btnGhost,
            ...(isHistoryDisabled || isSaving ? disabledStyle : {}),
          }}
        >
          History
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        style={{
          ...btnCancel,
          ...(isSaving ? disabledStyle : {}),
        }}
      >
        Cancel
      </button>
    </div>
  );
}
