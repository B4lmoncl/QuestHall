"use client";

import { type ReactNode } from "react";

interface InfoTooltipProps {
  /** Plain text or JSX content for the tooltip body */
  text: string | ReactNode;
  /** Alignment of tooltip panel relative to trigger */
  align?: "left" | "right";
  /** Optional children — the hover target. If omitted, wraps the adjacent label. */
  children?: ReactNode;
}

/**
 * CK3-style hover tooltip.
 * Wraps its children (or renders an inline trigger) and shows
 * a tooltip panel on hover with a golden loading-bar animation.
 */
export function InfoTooltip({ text, align = "left", children }: InfoTooltipProps) {
  return (
    <span className="info-tooltip-wrap">
      {children ?? (
        <span
          style={{
            borderBottom: "1px dotted rgba(255,215,0,0.4)",
            color: "inherit",
            cursor: "help",
          }}
        />
      )}
      <span className={`info-tooltip-panel${align === "right" ? " align-right" : ""}`}>
        <span className="info-tooltip-body">
          {typeof text === "string" ? <p>{text}</p> : text}
        </span>
      </span>
    </span>
  );
}

export default InfoTooltip;
