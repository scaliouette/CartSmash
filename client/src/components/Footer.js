import React from 'react';

const Footer = ({ currentView, onViewChange }) => {
  const currentYear = new Date().getFullYear();

  const handleViewChange = (view) => {
    onViewChange(view);
  };

  const styles = {
    footer: {
      backgroundColor: '#1f2937',
      color: '#9ca3af',
      marginTop: '60px'
    },
    container: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '48px 20px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '32px',
      marginBottom: '32px'
    },
    brandSection: {
      gridColumn: '1 / -1',
      marginBottom: '20px'
    },
    brandTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '12px',
      background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    brandDescription: {
      color: '#6b7280',
      marginBottom: '16px',
      maxWidth: '500px',
      lineHeight: '1.6'
    },
    socialLinks: {
      display: 'flex',
      gap: '16px'
    },
    socialLink: {
      color: '#9ca3af',
      transition: 'color 0.2s',
      cursor: 'pointer',
      textDecoration: 'none'
    },
    sectionTitle: {
      color: '#ffffff',
      fontWeight: '600',
      marginBottom: '16px',
      fontSize: '16px'
    },
    linksList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    linkItem: {
      marginBottom: '8px'
    },
    link: {
      color: '#9ca3af',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'color 0.2s',
      background: 'none',
      border: 'none',
      padding: 0,
      fontSize: '14px'
    },
    bottomBar: {
      marginTop: '32px',
      paddingTop: '32px',
      borderTop: '1px solid #374151',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    },
    copyright: {
      color: '#6b7280',
      fontSize: '14px',
      textAlign: 'center'
    },
    bottomLinks: {
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    icon: {
      width: '24px',
      height: '24px',
      fill: 'currentColor'
    }
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          {/* Brand Section */}
          <div style={styles.brandSection}>
            <h3 style={styles.brandTitle}>💥 CARTSMASH</h3>
            <p style={styles.brandDescription}>
              Smart grocery list management with AI-powered parsing. Transform any list into organized, ready-to-order products instantly.
            </p>
            <div style={styles.socialLinks}>
              {/* Social Media Icons */}
              <a 
                href="https://twitter.com/cartsmash" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
                onMouseOver={(e) => e.target.style.color = '#ffffff'}
                onMouseOut={(e) => e.target.style.color = '#9ca3af'}
              >
                <svg style={styles.icon} viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                </svg>
              </a>
              <a 
                href="https://facebook.com/cartsmash" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
                onMouseOver={(e) => e.target.style.color = '#ffffff'}
                onMouseOut={(e) => e.target.style.color = '#9ca3af'}
              >
                <svg style={styles.icon} viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a 
                href="https://linkedin.com/company/cartsmash" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
                onMouseOver={(e) => e.target.style.color = '#ffffff'}
                onMouseOut={(e) => e.target.style.color = '#9ca3af'}
              >
                <svg style={styles.icon} viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Legal Section */}
          <div>
            <h4 style={styles.sectionTitle}>Legal</h4>
            <ul style={styles.linksList}>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('privacy')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Privacy Policy
                </button>
              </li>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('terms')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Terms of Service
                </button>
              </li>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('cookies')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Cookie Policy
                </button>
              </li>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('accessibility')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Accessibility
                </button>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h4 style={styles.sectionTitle}>Support</h4>
            <ul style={styles.linksList}>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('help')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Help Center
                </button>
              </li>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('faq')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  FAQs
                </button>
              </li>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('contact')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Contact Us
                </button>
              </li>
              <li style={styles.linkItem}>
                <a 
                  href="mailto:support@cartsmash.com" 
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  support@cartsmash.com
                </a>
              </li>
              <li style={styles.linkItem}>
                <button 
                  onClick={() => handleViewChange('stores')}
                  style={styles.link}
                  onMouseOver={(e) => e.target.style.color = '#ffffff'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                  Stores
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={styles.bottomBar}>
          <p style={styles.copyright}>
            © {currentYear} CARTSMASH. All rights reserved.
          </p>
          <div style={styles.bottomLinks}>
            <button 
              onClick={() => handleViewChange('home')}
              style={styles.link}
              onMouseOver={(e) => e.target.style.color = '#ffffff'}
              onMouseOut={(e) => e.target.style.color = '#9ca3af'}
            >
              Home
            </button>
            <a 
              href="https://status.cartsmash.com" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.link}
              onMouseOver={(e) => e.target.style.color = '#ffffff'}
              onMouseOut={(e) => e.target.style.color = '#9ca3af'}
            >
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;