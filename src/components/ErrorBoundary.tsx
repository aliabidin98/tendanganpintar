/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  resetLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AR Tendangan Pintar Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public resetBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Terjadi Kendala Memuat Permainan',
        fallbackMessage = 'Aplikasi AR Tendangan Pintar mengalami kendala saat memuat atau memproses grafis/kamera. Silakan coba kembali atau muat ulang.',
        onReset,
        resetLabel = 'Kembali ke Menu Utama',
      } = this.props;

      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
          <div className="relative max-w-lg w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            {/* Header Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] mb-2">
              {fallbackTitle}
            </h1>
            <p className="text-sm text-slate-300 mb-6">
              {fallbackMessage}
            </p>

            {this.state.error && (
              <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 mb-6 text-left overflow-x-auto text-xs font-mono text-rose-300 max-h-32">
                <span className="font-bold text-rose-400">Pesan Error: </span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
              {onReset && (
                <button
                  type="button"
                  onClick={this.resetBoundary}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  {resetLabel}
                </button>
              )}

              <button
                type="button"
                onClick={this.handleReload}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl ${
                  onReset
                    ? 'bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/30'
                } font-bold text-sm transition-transform active:scale-95 cursor-pointer`}
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Permainan
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Data & Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
