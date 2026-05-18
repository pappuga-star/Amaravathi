import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, RefreshCw } from 'lucide-react';
import { Button } from '@amaravathi/shared-ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    this.setState({ errorInfo });
    if (process.env.NODE_ENV === 'development') {
      console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6 font-sans">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-8 shadow-xl text-center flex flex-col items-center">
            <div className="rounded-full bg-rose-50 p-4 text-rose-600 mb-5 animate-bounce">
              <AlertOctagon size={48} />
            </div>

            <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
              Something went wrong.
            </h1>
            <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
              An unexpected rendering or network failure occurred. Click below to reload the application.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-6">
              <Button
                onClick={this.handleRetry}
                variant="default"
                className="h-10 text-xs px-5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow"
              >
                <RotateCw size={14} className="animate-spin animate-infinite" style={{ animationDuration: '3s' }} />
                <span>Refresh Page</span>
              </Button>
              <Button
                onClick={this.handleResetState}
                variant="secondary"
                className="h-10 text-xs px-5 flex items-center gap-1.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </Button>
            </div>

            {isDev && this.state.error && (
              <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-auto max-h-60 mt-4">
                <p className="text-xs font-bold text-rose-600 font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-[10px] text-slate-500 font-mono whitespace-pre overflow-x-auto leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
