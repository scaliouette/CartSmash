import React, { useEffect } from 'react';

// Icon components
const ExternalLink = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const DollarSign = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const Info = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShoppingCart = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
  </svg>
);

const AffiliateDisclosure = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb'
  };

  const contentStyle = {
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '32px 16px'
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '48px'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px'
  };

  const iconStyle = {
    width: '64px',
    height: '64px',
    color: '#FF6B35',
    margin: '0 auto 16px auto'
  };

  const headingStyle = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #FF6B35'
  };

  const textStyle = {
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '16px'
  };

  const highlightBoxStyle = {
    backgroundColor: '#fef3f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '32px'
  };

  const importantBoxStyle = {
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px'
  };

  const backButtonStyle = {
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '32px',
    transition: 'transform 0.2s'
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={cardStyle}>
          {/* Back Button */}
          <button
            onClick={onBack}
            style={backButtonStyle}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ← Back to Home
          </button>

          <div style={headerStyle}>
            <DollarSign style={iconStyle} />
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
              Affiliate Disclosure
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Transparency in our partnerships and recommendations
            </p>
          </div>

          {/* Important Notice */}
          <div style={highlightBoxStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <Info style={{ width: '24px', height: '24px', color: '#dc2626', marginRight: '12px', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', margin: '0 0 8px 0' }}>
                  Important Disclosure
                </h3>
                <p style={{ color: '#7f1d1d', margin: 0 }}>
                  <strong>CartSmash participates in affiliate marketing programs.</strong> When you make purchases through our platform or links, we may receive compensation. This helps support our free service but does not affect the prices you pay or influence our recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* FTC Compliance */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={headingStyle}>FTC Compliance Statement</h2>
            <p style={textStyle}>
              In accordance with the Federal Trade Commission's (FTC) guidelines concerning the use of endorsements
              and testimonials in advertising, CartSmash provides the following disclosures:
            </p>

            <div style={importantBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <ShoppingCart style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '12px', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0' }}>
                    Affiliate Relationships
                  </h4>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    CartSmash has financial relationships with certain retailers and service providers. We may earn
                    commissions when you make purchases through our integrated checkout systems or affiliate links.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Current Partnerships */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={headingStyle}>Current Affiliate Partnerships</h2>
            <p style={textStyle}>
              CartSmash currently partners with the following companies through official affiliate programs:
            </p>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' }}>
                🛒 Instacart Partnership
              </h4>
              <ul style={{ paddingLeft: '20px', margin: '0', color: '#6b7280', lineHeight: '1.6' }}>
                <li>CartSmash is an authorized partner in the Instacart Developer Platform</li>
                <li>We earn commissions when you complete purchases through Instacart integration</li>
                <li>Pricing and product availability are controlled by Instacart and participating retailers</li>
                <li>We do not mark up prices - you pay the same price as shopping directly on Instacart</li>
              </ul>
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' }}>
                📱 Additional Services
              </h4>
              <ul style={{ paddingLeft: '20px', margin: '0', color: '#6b7280', lineHeight: '1.6' }}>
                <li>AI processing and recipe analysis services</li>
                <li>Cloud storage and synchronization providers</li>
                <li>Analytics and performance monitoring tools</li>
              </ul>
            </div>
          </section>

          {/* How It Works */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={headingStyle}>How Affiliate Compensation Works</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e', margin: '0 0 8px 0' }}>
                  1. You Use CartSmash
                </h4>
                <p style={{ fontSize: '14px', color: '#075985', margin: 0 }}>
                  Create your shopping list using our AI-powered parsing and organization tools - completely free.
                </p>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#14532d', margin: '0 0 8px 0' }}>
                  2. You Shop Through Partners
                </h4>
                <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
                  When you choose to purchase through Instacart or other integrated services, you're redirected to their platform.
                </p>
              </div>

              <div style={{ backgroundColor: '#fef7ed', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#9a3412', margin: '0 0 8px 0' }}>
                  3. We Earn Commission
                </h4>
                <p style={{ fontSize: '14px', color: '#c2410c', margin: 0 }}>
                  If you complete a purchase, we receive a small commission from the retailer - not from you.
                </p>
              </div>
            </div>
          </section>

          {/* Our Promise */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={headingStyle}>Our Promise to You</h2>

            <div style={importantBoxStyle}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 16px 0' }}>
                Editorial Independence & Transparency
              </h4>
              <ul style={{ paddingLeft: '20px', margin: '0', color: '#6b7280', lineHeight: '1.8' }}>
                <li><strong>No Price Markups:</strong> Affiliate relationships never increase the prices you pay</li>
                <li><strong>Honest Recommendations:</strong> We only partner with services we genuinely use and recommend</li>
                <li><strong>User First:</strong> Our primary goal is providing the best grocery management experience</li>
                <li><strong>Clear Disclosure:</strong> We clearly identify affiliate links and partnerships</li>
                <li><strong>Choice Freedom:</strong> You can always choose to shop elsewhere - we provide the tools, you make the choices</li>
              </ul>
            </div>
          </section>

          {/* Legal Information */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={headingStyle}>Legal Information</h2>
            <p style={textStyle}>
              This disclosure is made in accordance with:
            </p>
            <ul style={{ paddingLeft: '24px', color: '#6b7280', lineHeight: '1.6', marginBottom: '20px' }}>
              <li>Federal Trade Commission's 16 CFR Part 255: "Guides Concerning the Use of Endorsements and Testimonials in Advertising"</li>
              <li>California's Online Privacy Protection Act</li>
              <li>General Data Protection Regulation (GDPR) transparency requirements</li>
              <li>Various state consumer protection laws</li>
            </ul>

            <p style={textStyle}>
              <strong>Material Connections:</strong> CartSmash has material connections with the companies whose products
              and services we may recommend through affiliate partnerships. These connections may include financial
              compensation, free products, or other valuable considerations.
            </p>
          </section>

          {/* Contact Section */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={headingStyle}>Questions About Our Affiliations?</h2>
            <p style={textStyle}>
              We believe in complete transparency. If you have any questions about our affiliate relationships,
              compensation, or business practices, please don't hesitate to reach out:
            </p>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#1f2937', fontWeight: '500' }}>
                📧 Email: <a href="mailto:affiliates@cartsmash.com" style={{ color: '#FF6B35', textDecoration: 'none' }}>affiliates@cartsmash.com</a>
              </p>
              <p style={{ margin: '0 0 8px 0', color: '#1f2937', fontWeight: '500' }}>
                📧 General Inquiries: <a href="mailto:support@cartsmash.com" style={{ color: '#FF6B35', textDecoration: 'none' }}>support@cartsmash.com</a>
              </p>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                We typically respond within 24-48 hours during business days.
              </p>
            </div>
          </section>

          {/* Last Updated */}
          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 8px 0' }}>
              Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
              We may update this disclosure as our partnerships evolve. Check back periodically for changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDisclosure;