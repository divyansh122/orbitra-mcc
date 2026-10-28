import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  name: string
  /** Applied to the default fallback so it keeps the failed panel's grid slot. */
  className?: string
  fallback?: ReactNode
  children: ReactNode
}

/** Contains a failing panel so one broken widget never blanks the whole console. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[orbitra] ${this.props.name} failed`, error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      this.props.fallback ?? (
        <div className={`panel flex h-full items-center justify-center p-4 text-center ${this.props.className ?? ''}`}>
          <div>
            <p className="hud-label text-[0.8rem] text-amber">{this.props.name} offline</p>
            <button className="hud-btn mt-3" onClick={() => this.setState({ failed: false })}>
              Restart module
            </button>
          </div>
        </div>
      )
    )
  }
}
