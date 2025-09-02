import React, { useEffect } from 'react';

// Icon components (replacing lucide-react)
const ArrowLeft = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ExternalLink = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const Shield = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const Lock = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const Eye = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Database = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const Privacy = ({ onBack }) => {
  useEffect(() => {
    // Option 1: Auto-redirect to external privacy policy
    // Uncomment this if you want automatic redirect
    // window.location.href = 'https://www.freeprivacypolicy.com/live/f3f10b15-024b-43c8-baa6-2e33642fafd5';
    
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleViewPrivacyPolicy = () => {
    window.open('https://www.freeprivacypolicy.com/live/f3f10b15-024b-43c8-baa6-2e33642fafd5', '_blank');
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb'
  };

  const contentStyle = {
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '32px 16px'
  };

  const backButtonStyle = {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'color 0.2s'
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '32px'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '32px'
  };

  const iconStyle = {
    width: '64px',
    height: '64px',
    color: '#FF6B35',
    margin: '0 auto 16px auto'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  };

  const summaryCardStyle = {
    backgroundColor: '#dbeafe',
    borderRadius: '8px',
    padding: '16px'
  };

  const buttonStyle = {
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s'
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <button 
          onClick={handleBack}
          style={backButtonStyle}
          onMouseOver={e => e.target.style.color = '#1f2937'}
          onMouseOut={e => e.target.style.color = '#6b7280'}
        >
          <ArrowLeft style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Back to CARTSMASH
        </button>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <Shield style={iconStyle} />
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>Privacy Policy</h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Your privacy is important to us
            </p>
          </div>

          {/* Summary Section */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>Privacy at a Glance</h2>
            <div style={gridStyle}>
              <div style={summaryCardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Lock style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '12px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>
                      Data Security
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      Your data is encrypted and stored securely using industry-standard practices.
                    </p>
                  </div>
                </div>
              </div>

              <div style={summaryCardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Eye style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '12px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>
                      Transparency
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      We're clear about what data we collect and how it's used.
                    </p>
                  </div>
                </div>
              </div>

              <div style={summaryCardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Database style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '12px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>
                      Data Control
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      You have control over your data and can request deletion at any time.
                    </p>
                  </div>
                </div>
              </div>

              <div style={summaryCardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Shield style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '12px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>
                      No Selling
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      We never sell your personal information to third parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What We Collect */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              What Information We Collect
            </h2>
            <div style={{ color: '#6b7280', lineHeight: '1.6' }}>
              <ul style={{ paddingLeft: '24px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>Account information (email, name) when you sign up</li>
                <li style={{ marginBottom: '8px' }}>Shopping lists and recipes you create</li>
                <li style={{ marginBottom: '8px' }}>Usage analytics to improve our service</li>
                <li style={{ marginBottom: '8px' }}>Store integration data (when you connect to Kroger or other services)</li>
              </ul>
            </div>
          </div>

          {/* How We Use It */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              How We Use Your Information
            </h2>
            <div style={{ color: '#6b7280', lineHeight: '1.6' }}>
              <ul style={{ paddingLeft: '24px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>To provide and improve CARTSMASH services</li>
                <li style={{ marginBottom: '8px' }}>To sync your data across devices</li>
                <li style={{ marginBottom: '8px' }}>To send you important service updates</li>
                <li style={{ marginBottom: '8px' }}>To analyze usage patterns and improve our AI</li>
              </ul>
            </div>
          </div>

          {/* Data Sharing */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Data Sharing & Third Parties
            </h2>
            <div style={{ color: '#6b7280', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}>
                We only share your data in these specific circumstances:
              </p>
              <ul style={{ paddingLeft: '24px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>With your explicit consent (like when connecting to Kroger)</li>
                <li style={{ marginBottom: '8px' }}>To comply with legal requirements</li>
                <li style={{ marginBottom: '8px' }}>With trusted service providers who help us operate CARTSMASH</li>
                <li style={{ marginBottom: '8px' }}>Anonymous, aggregated data for research purposes</li>
              </ul>
            </div>
          </div>

          {/* Your Rights */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Your Rights
            </h2>
            <div style={{ color: '#6b7280', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}>You have the right to:</p>
              <ul style={{ paddingLeft: '24px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>Access your personal data</li>
                <li style={{ marginBottom: '8px' }}>Correct inaccurate information</li>
                <li style={{ marginBottom: '8px' }}>Delete your account and data</li>
                <li style={{ marginBottom: '8px' }}>Export your data</li>
                <li style={{ marginBottom: '8px' }}>Opt out of marketing communications</li>
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' }}>
              Read Our Complete Privacy Policy
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', margin: '0 0 20px 0' }}>
              For detailed information about our privacy practices, please review our comprehensive privacy policy.
            </p>
            
            <button
              onClick={handleViewPrivacyPolicy}
              style={buttonStyle}
              onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.target.style.transform = 'translateY(0)'}
            >
              View Full Privacy Policy
              <ExternalLink style={{ width: '16px', height: '16px' }} />
            </button>
            
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px', margin: '12px 0 0 0' }}>
              Opens in a new window
            </p>
          </div>

          {/* Contact Section */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0' }}>
              Questions about Privacy?
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Contact us at{' '}
              <a 
                href="mailto:privacy@cartsmash.com"
                style={{ color: '#FF6B35', textDecoration: 'none' }}
                onMouseOver={e => e.target.style.textDecoration = 'underline'}
                onMouseOut={e => e.target.style.textDecoration = 'none'}
              >
                privacy@cartsmash.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;