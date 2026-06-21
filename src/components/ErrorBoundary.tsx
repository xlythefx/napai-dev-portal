import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes from any descendant so one broken component (a flaky
 * third-party widget, a bad icon fetch, etc.) shows a fallback instead of blanking the
 * whole page. Without this, an uncaught throw unmounts the entire React tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ margin: "0 0 8px" }}>Something went wrong.</h2>
          <p style={{ color: "#666", margin: "0 0 16px" }}>
            A component crashed while rendering.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#b00020", fontSize: 12 }}>
            {this.state.error.message}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12 }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
