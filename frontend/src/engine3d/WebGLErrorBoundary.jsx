import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * WebGLErrorBoundary
 * Catches WebGL initialization failures, context losses, or Three.js runtime crashes
 * and displays an aerospace-styled fallback UI without crashing the rest of the application.
 */
export default class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[AeroTwin 3D Viewport] WebGL render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="relative w-full rounded-lg bg-slate-950/90 border border-amber-800/60 p-6 flex flex-col items-center justify-center text-center overflow-hidden"
          style={{ height: this.props.height || 480 }}
        >
          <div className="w-12 h-12 rounded-full bg-amber-950/40 border border-amber-600/40 flex items-center justify-center text-amber-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-mono font-bold text-amber-300 uppercase tracking-wider">
            3D Graphics Acceleration Notice
          </h4>
          <p className="text-xs font-mono text-slate-400 mt-2 max-w-md">
            WebGL context encountered a rendering fault or hardware acceleration is restricted.
            {this.state.error?.message && (
              <span className="block text-[11px] text-slate-500 mt-1">
                Detail: {this.state.error.message}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry 3D Initialization
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
