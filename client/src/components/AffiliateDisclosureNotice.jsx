import React from 'react';

const AffiliateDisclosureNotice = ({
  variant = 'default',
  position = 'bottom',
  onLearnMore = null,
  compact = false
}) => {
  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      window.setCurrentView?.('affiliate-disclosure');
    }
  };

  const baseStyle = {
    fontSize: compact ? '11px' : '12px',
    color: '#6b7280',
    lineHeight: '1.4',
    marginTop: position === 'bottom' ? '12px' : '0',
    marginBottom: position === 'top' ? '12px' : '0'
  };

  const linkStyle = {
    color: '#FF6B35',
    textDecoration: 'none',
    cursor: 'pointer',
    fontWeight: '500'
  };

  const iconStyle = {
    width: '12px',
    height: '12px',
    display: 'inline',
    marginRight: '4px',
    verticalAlign: 'text-top'
  };

  const containerStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    padding: compact ? '6px 8px' : '8px 12px',
    backgroundColor: variant === 'prominent' ? '#fef7ed' : '#f9fafb',
    border: variant === 'prominent' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
    borderRadius: '6px',
    marginTop: position === 'bottom' ? '12px' : '0',
    marginBottom: position === 'top' ? '12px' : '0'
  };

  const InfoIcon = () => (
    <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  // Compact version for tight spaces
  if (compact) {
    return (
      <div style={baseStyle}>
        <InfoIcon />
        <span>
          We may earn commissions from purchases.
          <button
            onClick={handleLearnMore}
            style={{ ...linkStyle, background: 'none', border: 'none', padding: 0, marginLeft: '4px' }}
            onMouseOver={e => e.target.style.textDecoration = 'underline'}
            onMouseOut={e => e.target.style.textDecoration = 'none'}
          >
            Learn more
          </button>
        </span>
      </div>
    );
  }

  // Prominent version for checkout flows
  if (variant === 'prominent') {
    return (
      <div style={containerStyle}>
        <InfoIcon />
        <div>
          <p style={{ ...baseStyle, margin: '0 0 4px 0', color: '#c2410c', fontWeight: '500' }}>
            <strong>Affiliate Partnership Notice</strong>
          </p>
          <p style={{ ...baseStyle, margin: 0, color: '#9a3412' }}>
            CartSmash earns commissions when you shop through our Instacart integration.
            This doesn't affect your prices or our recommendations.
            <button
              onClick={handleLearnMore}
              style={{ ...linkStyle, background: 'none', border: 'none', padding: 0, marginLeft: '4px' }}
              onMouseOver={e => e.target.style.textDecoration = 'underline'}
              onMouseOut={e => e.target.style.textDecoration = 'none'}
            >
              View full disclosure
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Default version
  return (
    <div style={containerStyle}>
      <InfoIcon />
      <span style={baseStyle}>
        CartSmash participates in affiliate programs and may earn commissions from purchases.
        <button
          onClick={handleLearnMore}
          style={{ ...linkStyle, background: 'none', border: 'none', padding: 0, marginLeft: '4px' }}
          onMouseOver={e => e.target.style.textDecoration = 'underline'}
          onMouseOut={e => e.target.style.textDecoration = 'none'}
        >
          Learn more
        </button>
      </span>
    </div>
  );
};

export default AffiliateDisclosureNotice;