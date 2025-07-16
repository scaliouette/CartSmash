import React from 'react';
import GroceryListForm from './GroceryListForm';

function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          ðŸ›’ Cart Smash
        </h1>
        <p style={styles.subtitle}>
          AI-Powered List Destroyer ðŸ’¥
        </p>
      </header>
      
      <main style={styles.main}>
        <GroceryListForm />
      </main>
      
      <footer style={styles.footer}>
        <p>Made with ðŸ’¥ by Cart Smash</p>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    color: 'white',
    padding: 'clamp(20px, 5vw, 40px) 20px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(255,107,53,0.3)',
  },
  title: {
    margin: '0',
    fontSize: 'clamp(32px, 8vw, 64px)',
    fontWeight: '900',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    letterSpacing: '2px',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: 'clamp(14px, 4vw, 22px)',
    opacity: '0.95',
    fontWeight: '600',
  },
  main: {
    flex: '1',
    padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 20px)',
  },
  footer: {
    backgroundColor: '#2c3e50',
    color: 'white',
    textAlign: 'center',
    padding: 'clamp(16px, 4vw, 20px)',
    marginTop: 'auto',
    fontSize: 'clamp(12px, 3vw, 16px)',
  },
};

export default App;
