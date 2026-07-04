import React from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fadeIn"
        onClick={onCancel}
      />
      {/* Dialog container */}
      <div className="relative w-full max-w-sm bg-slate-900/95 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-scaleUp text-slate-100 flex flex-col text-xs text-left gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <AlertTriangle size={16} />
            </div>
            <h4 className="font-extrabold text-white text-[14px] leading-tight">{title}</h4>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            type="button"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-slate-300 leading-relaxed text-[12px]">{message}</p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-xl cursor-pointer transition-all hover:text-white text-[11px]"
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer transition-all shadow-md active:scale-[0.98] text-[11px]"
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
