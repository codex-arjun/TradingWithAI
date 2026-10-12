import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#0f172a', color: '#ff5252', fontFamily: 'monospace', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>⚠️ TradePilot UI Runtime Error</h2>
          <p style={{ margin: '12px 0', fontSize: '13px', color: '#94a3b8' }}>
            The application crashed during render. Please review the error stack below:
          </p>
          <pre style={{ background: '#020617', padding: '16px', borderRadius: '6px', overflowX: 'auto', border: '1px solid #1e293b', color: '#38bdf8', fontSize: '12px', lineHeight: '1.5' }}>
            {this.state.error && this.state.error.toString()}
            {"\n\nStack:\n"}
            {this.state.error && this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
