import { useState, useCallback } from "react";

export interface ToastState {
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((type: ToastState["type"], title: string, message: string) => {
    setToast({ type, title, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    closeToast,
    setToast,
  };
}
