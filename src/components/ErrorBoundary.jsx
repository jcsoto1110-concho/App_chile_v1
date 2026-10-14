import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#fff', background: 'var(--bg-dark, #0d1117)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff' }}>Ha ocurrido un inconveniente</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', maxWidth: '320px', marginBottom: '20px' }}>
            {this.state.error?.message || 'Error inesperado al cargar la vista.'}
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 24px', borderRadius: '12px', background: 'var(--accent-primary, #00b4ff)',
              color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
