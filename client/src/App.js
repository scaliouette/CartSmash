import React from 'react';
import GroceryListForm from './GroceryListForm';

function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          🛒 Cart Smash
        </h1>
        <p style={styles.subtitle}>
          Smash through your grocery list! AI-Powered List Destroyer 💥
        </p>
      </header>
      
      <main style={styles.main}>
        <GroceryListForm />
      </main>
      
      <footer style={styles.footer}>
        <p>Made with 💥 by Cart Smash</p>
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
    backgroundColor: '#FF6B35',
    color: 'white',
    padding: '30px 20px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0',
    fontSize: '48px',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    margin: '10px 0 0 0',
    fontSize: '20px',
    opacity: '0.9',
  },
  main: {
    flex: '1',
    padding: '40px 20px',
  },
  footer: {
    backgroundColor: '#2c3e50',
    color: 'white',
    textAlign: 'center',
    padding: '20px',
    marginTop: 'auto',
  },
};

export default App;