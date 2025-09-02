import React, { useState, useEffect } from 'react';

// Icon components
const ArrowLeft = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const Mail = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const MessageSquare = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 16.5a2.25 2.25 0 01-2.25 2.25H15.75V22.5L12 18.75H7.5A2.25 2.25 0 015.25 16.5v-9a2.25 2.25 0 012.25-2.25h11.25A2.25 2.25 0 0121 7.5v9z" />
  </svg>
);

const Send = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const CheckCircle = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertCircle = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLink = ({ style }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const Contact = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Contact form submitted:', formData);
      
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        type: 'general'
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styles
  const primaryGradient = {
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)'
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  };

  const heroStyle = {
    ...primaryGradient,
    color: 'white'
  };

  const heroContentStyle = {
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '64px 16px'
  };

  const backButtonStyle = {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.9)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'color 0.2s'
  };

  const mainContentStyle = {
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '48px 16px'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px'
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '32px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  };

  const inputFocusStyle = {
    borderColor: '#FF6B35',
    outline: 'none'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical'
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
    transition: 'transform 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const linkStyle = {
    color: '#FF6B35',
    textDecoration: 'none',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div style={containerStyle}>
      {/* Hero Section */}
      <div style={heroStyle}>
        <div style={heroContentStyle}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Contact Us</h1>
          <p style={{ fontSize: '20px', opacity: 0.9, margin: 0 }}>We'd love to hear from you</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        <div style={gridStyle}>
          {/* Contact Form */}
          <div style={cardStyle}>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                Send us a message
              </h2>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </div>

            {submitStatus === 'success' && (
              <div style={{
                backgroundColor: '#d1fae5',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981' }} />
                <p style={{ color: '#065f46', margin: 0, fontWeight: '500' }}>
                  Message sent successfully! We'll get back to you soon.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                <p style={{ color: '#991b1b', margin: 0, fontWeight: '500' }}>
                  Something went wrong. Please try again or contact us directly.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>
                  Message Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="partnership">Partnership</option>
                  <option value="media">Media Inquiry</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help you..."
                  style={textareaStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...buttonStyle,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={e => {
                  if (!isSubmitting) e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={e => {
                  if (!isSubmitting) e.target.style.transform = 'translateY(0)';
                }}
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send style={{ width: '16px', height: '16px' }} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div style={cardStyle}>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                Get in touch
              </h2>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Have questions? We're here to help you make the most of CARTSMASH.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <Mail style={{ width: '24px', height: '24px', color: '#FF6B35', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ color: '#1f2937', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                    Email Support
                  </h3>
                  <p style={{ color: '#6b7280', margin: '0 0 8px 0' }}>
                    Our team typically responds within 24 hours.
                  </p>
                  <a
                    href="mailto:support@cartsmash.com"
                    style={linkStyle}
                    onMouseOver={e => e.target.style.textDecoration = 'underline'}
                    onMouseOut={e => e.target.style.textDecoration = 'none'}
                  >
                    support@cartsmash.com
                    <ExternalLink style={{ width: '16px', height: '16px' }} />
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <MessageSquare style={{ width: '24px', height: '24px', color: '#FF6B35', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ color: '#1f2937', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                    Feature Requests & Feedback
                  </h3>
                  <p style={{ color: '#6b7280', margin: '0 0 8px 0' }}>
                    Help us improve CARTSMASH by sharing your ideas.
                  </p>
                  <a
                    href="mailto:feedback@cartsmash.com"
                    style={linkStyle}
                    onMouseOver={e => e.target.style.textDecoration = 'underline'}
                    onMouseOut={e => e.target.style.textDecoration = 'none'}
                  >
                    feedback@cartsmash.com
                    <ExternalLink style={{ width: '16px', height: '16px' }} />
                  </a>
                </div>
              </div>

              {/* FAQ Section */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                padding: '20px',
                marginTop: '20px'
              }}>
                <h3 style={{ color: '#1f2937', fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
                  Quick Answers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <h4 style={{ color: '#374151', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                      How do I connect my Kroger account?
                    </h4>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      Visit the Stores page and follow the authentication flow for Kroger integration.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#374151', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                      Is my data secure?
                    </h4>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      Yes! We use industry-standard security measures to protect your information.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#374151', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                      Can I export my lists?
                    </h4>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      Yes, you can export your lists as CSV files from the results page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;