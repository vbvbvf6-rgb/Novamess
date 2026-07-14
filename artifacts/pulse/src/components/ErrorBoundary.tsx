import React from "react";
import PulseLogo from "@/components/PulseLogo";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "", errorId: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || "Неизвестная ошибка",
      errorId: Date.now().toString(36),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "", errorId: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-[28px] flex items-center justify-center">
            <PulseLogo size={64} />
          </div>
          <h1 className="text-xl font-black text-foreground mb-2">Что-то пошло не так</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Произошла непредвиденная ошибка. Данные не потеряны — перезагрузите страницу.
          </p>
          <details className="mb-5 text-left" open>
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Технические детали
            </summary>
            <pre className="mt-2 text-[10px] text-muted-foreground bg-secondary/50 rounded-xl p-3 overflow-auto max-h-32 whitespace-pre-wrap break-all">
              {this.state.errorMessage}
              {"\n"}ID: {this.state.errorId}
            </pre>
          </details>
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Перезагрузить приложение
            </button>
            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-2xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }
}
