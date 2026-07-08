import React from "react";

export interface AvatarParticipant {
  id?: string;
  name: string;
  avatarColor?: string;
  email?: string;
}

interface AvatarProps {
  participant: AvatarParticipant;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTitle?: boolean;
}

export function Avatar({
  participant,
  size = "sm",
  className = "",
  showTitle = true,
}: AvatarProps) {
  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
    xl: "w-12 h-12 text-lg",
  };

  const name = participant.name || "?";
  const initial = name[0] || "?";
  const bgColor = participant.avatarColor || "#475569";
  const title = showTitle ? `${name}${participant.email ? ` (${participant.email})` : ""}` : undefined;

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`rounded-full font-bold text-white flex items-center justify-center shrink-0 uppercase transition-transform hover:scale-105 select-none border border-slate-900 shadow-sm ${sizeClasses[size]} ${className}`}
      title={title}
    >
      {initial}
    </div>
  );
}
