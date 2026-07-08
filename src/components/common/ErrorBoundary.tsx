import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  lang?: "zh" | "en";
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside component:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const isZh = this.props.lang !== "en";
      return (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-2xl mx-auto my-8 animate-fade-in-scale">
          <span className="text-3xl">⚠️</span>
          <h3 className="text-sm font-extrabold text-rose-400 mt-2">
            {isZh ? "此模組載入或執行時發生錯誤" : "An error occurred in this module"}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-mono">
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-1.5 bg-rose-500/25 border border-rose-500/30 hover:bg-rose-500/35 text-white text-xs font-bold rounded-xl cursor-pointer transition"
          >
            {isZh ? "重試載入模組" : "Retry Loading Module"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
