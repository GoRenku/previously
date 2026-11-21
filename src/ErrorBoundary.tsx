import { Component, type ReactNode } from 'react';

/**
 * Catches render errors anywhere below it, so a crash shows a way back
 * instead of a blank page. The viewer's position is kept in localStorage,
 * so reloading loses nothing.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="theme-root" data-scheme="dark">
        <main className="wrap" style={{ paddingTop: '18vh', maxWidth: 640 }}>
          <div className="kicker" style={{ marginBottom: 14 }}>Something went wrong</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 64px)', marginBottom: 18 }}>
            That didn't load<em className="serif-i">…</em>
          </h1>
          <p className="lede" style={{ marginBottom: 28 }}>
            This page hit an error. Your place in every show is saved, so try again, or go back to all shows.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
            <a className="btn btn-ghost" href="/">All shows</a>
          </div>
        </main>
      </div>
    );
  }
}
