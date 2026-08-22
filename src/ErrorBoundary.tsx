import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; correlationId: string }> {
  state = { failed: false, correlationId: "" };

  static getDerivedStateFromError() {
    return { failed: true, correlationId: `R360-${Date.now().toString(36).toUpperCase()}` };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Resource360 render failure", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="fatal-state"><span className="brand-mark">exl</span><p>Resource360 sanitized demo</p><h1>We could not display this workspace.</h1><p>Reset the current view or reload the demo. No EXL production transaction has been affected.</p><strong>Correlation ID · {this.state.correlationId}</strong><button onClick={() => window.location.assign(import.meta.env.BASE_URL)}>Return to demo home</button></main>;
  }
}
