"use client";

import React from "react";
import { useContentOverlay } from "./ContentOverlayProvider.js";

type Position = "bottom-left" | "bottom-right" | "top-left" | "top-right";

interface EditModeToggleProps {
  /** Corner placement for the floating toggle. Default: "bottom-left". */
  position?: Position;
  /** Optional className applied to the outer wrapper, for style overrides. */
  className?: string;
}

function positionStyle(position: Position): React.CSSProperties {
  const base: React.CSSProperties = { position: "fixed", zIndex: 1200 };
  switch (position) {
    case "bottom-right":
      return { ...base, bottom: 16, right: 16 };
    case "top-left":
      return { ...base, top: 16, left: 16 };
    case "top-right":
      return { ...base, top: 16, right: 16 };
    case "bottom-left":
    default:
      return { ...base, bottom: 16, left: 16 };
  }
}

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  alignItems: "flex-start",
};

const toggleButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  borderRadius: "9999px",
  border: "1px solid rgba(45, 106, 79, 0.2)",
  background: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  fontSize: "13px",
  fontWeight: 600,
  color: "#2D6A4F",
  cursor: "pointer",
  transition: "background 0.15s",
};

const dotBase: React.CSSProperties = {
  display: "inline-block",
  width: "10px",
  height: "10px",
  borderRadius: "50%",
};

const pendingBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "20px",
  height: "20px",
  padding: "0 6px",
  borderRadius: "9999px",
  background: "#FFD60A",
  color: "#000",
  fontSize: "11px",
  fontWeight: 700,
  marginLeft: "4px",
};

const publishButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "8px 16px",
  borderRadius: "9999px",
  border: "1px solid #2D6A4F",
  background: "#2D6A4F",
  color: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const publishCountBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "20px",
  height: "20px",
  padding: "0 6px",
  borderRadius: "9999px",
  background: "#fff",
  color: "#2D6A4F",
  fontSize: "11px",
  fontWeight: 700,
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

export function EditModeToggle({ position = "bottom-left", className }: EditModeToggleProps) {
  const {
    isAdmin,
    isCheckingAdmin,
    isEditMode,
    pendingCount,
    unpublishedCount,
    isPublishing,
    toggleEditMode,
    publishAllDrafts,
  } = useContentOverlay();

  if (isCheckingAdmin || !isAdmin) return null;

  const canPublish = isEditMode && unpublishedCount > 0 && pendingCount === 0 && !isPublishing;

  const onPublish = async () => {
    if (!canPublish) return;
    try {
      await publishAllDrafts();
    } catch (error) {
      console.error("[content-overlay] Failed to publish drafts:", error);
    }
  };

  return (
    <div className={className} style={{ ...positionStyle(position), ...wrapperStyle }}>
      <button
        type="button"
        onClick={toggleEditMode}
        style={toggleButtonStyle}
        aria-pressed={isEditMode}
        aria-label="Toggle edit mode"
      >
        <span
          style={{
            ...dotBase,
            background: isEditMode ? "#22c55e" : "#9ca3af",
          }}
        />
        {isEditMode ? "Edit Mode On" : "Edit Mode Off"}
        {pendingCount > 0 && <span style={pendingBadgeStyle}>{pendingCount}</span>}
      </button>

      {isEditMode && (
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish}
          style={{
            ...publishButtonStyle,
            ...(!canPublish ? disabledStyle : {}),
          }}
        >
          {isPublishing ? "Publishing..." : "Publish Drafts"}
          <span style={publishCountBadgeStyle}>{unpublishedCount}</span>
        </button>
      )}
    </div>
  );
}
