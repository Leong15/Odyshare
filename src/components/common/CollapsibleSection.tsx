import React, { useState } from "react";

interface CollapsibleSectionProps {
  title: React.ReactNode;
  ariaLabel?: string;
  headerIcon?: React.ReactNode;
  titleClassName?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  ariaLabel,
  headerIcon,
  titleClassName = "text-indigo-300",
  defaultCollapsed = false,
  children,
  className = "bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0 text-left",
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={ariaLabel || "Toggle section / 切換收合狀態"}
        className="flex items-center justify-between cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
        onClick={() => setIsCollapsed(!isCollapsed)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleClassName}`}>
          {headerIcon}
          <span>{title}</span>
        </div>
        <span className="text-slate-400 text-[10px] font-bold">
          {isCollapsed ? "＋" : "－"}
        </span>
      </div>

      {!isCollapsed && (
        <div className="space-y-1.5 pt-1 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}
