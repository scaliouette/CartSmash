import React from 'react';

const HeroSection = () => {
  const styles = {
    heroContainer: {
      background: 'linear-gradient(135deg, #002244 0%, #003366 100%)',
      color: 'white',
      padding: '64px 16px',
      textAlign: 'center'
    },
    content: {
      maxWidth: '896px',
      margin: '0 auto'
    },
    mainTitle: {
      fontSize: '48px',
      fontWeight: 'bold',
      marginBottom: '16px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      '@media (min-width: 768px)': {
        fontSize: '64px'
      }
    },
    subtitle: {
      fontSize: '32px',
      fontWeight: '600',
      color: '#FB4F14',
      marginBottom: '24px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      '@media (min-width: 768px)': {
        fontSize: '36px'
      }
    },
    description: {
      fontSize: '18px',
      color: 'rgba(255, 255, 255, 0.9)',
      maxWidth: '512px',
      margin: '0 auto',
      lineHeight: '1.6',
      '@media (min-width: 768px)': {
        fontSize: '20px'
      }
    }
  };

  return (
    <div style={styles.heroContainer}>
      <div style={styles.content}>
        <h1 style={styles.mainTitle}>
          CARTSMASH
        </h1>
        <h2 style={styles.subtitle}>
          Shop Smarter, Save Faster
        </h2>
        <p style={styles.description}>
          AI-powered grocery parsing that understands what you actually want to buy.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;