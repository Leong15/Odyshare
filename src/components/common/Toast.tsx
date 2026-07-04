import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export interface ToastProps {
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ type, title, message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle size={16} className="text-emerald-400" />;
      case "error":
        return <XCircle size={16} className="text-rose-400" />;
      case "warning":
        return <AlertTriangle size={16} className="text-amber-400" />;
      default:
        return <Info size={16} className="text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "border-emerald-500/30";
      case "error":
        return "border-rose-500/30";
      case "warning":
        return "border-amber-500/30";
      default:
        return "border-blue-500/30";
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] w-11/12 max-w-sm bg-slate-900/95 border ${getBorderColor()} rounded-xl p-3.5 shadow-2xl backdrop-blur-xl animate-fadeIn text-slate-100 flex items-start gap-3 text-xs`}>
      <div className="mt-0.5 shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0 text-left">
        <h5 className="font-extrabold text-white text-[12.5px] leading-tight mb-1">{title}</h5>
        <p className="text-slate-300 leading-normal text-[11px]">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}
