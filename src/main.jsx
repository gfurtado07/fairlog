import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('FairLog Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f1117',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: '#1a1d27',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '20px' }}>
              ⚠️ Erro ao carregar o FairLog
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
              Abra o console do navegador (F12 → Console) e compartilhe o erro para diagnóstico.
            </p>
            <pre style={{
              background: '#0f1117',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f87171',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {this.state.error?.toString()}
              {'\n'}
              {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: '#f59e0b',
                color: '#0f1117',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
