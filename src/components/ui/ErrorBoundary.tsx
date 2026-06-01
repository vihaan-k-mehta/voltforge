"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] 3D scene crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-full w-full items-center justify-center bg-zinc-950">
          <div className="text-center p-8 glass-panel rounded-xl max-w-sm mx-4">
            <div className="text-zinc-300 font-medium mb-1">3D preview unavailable</div>
            <div className="text-zinc-500 text-xs mb-5 font-mono break-all">
              {this.state.error?.message ?? "Unknown error"}
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
