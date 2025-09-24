import React, { useEffect } from 'react';

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Custom gradient style
  const primaryGradient = {
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)'
  };


  const headingStyle = {
    color: '#1f2937', 
    borderBottom: '2px solid #FF6B35',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    paddingBottom: '8px',
    margin: '0 0 16px 0'
  };

  const textStyle = {
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '0 0 12px 0'
  };

  const listStyle = {
    listStyleType: 'disc',
    paddingLeft: '24px',
    marginTop: '12px',
    color: '#6b7280'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Hero Section with Gradient */}
      <div style={{ ...primaryGradient, color: 'white' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '64px 16px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px', margin: 0 }}>Terms and Conditions</h1>
          <p style={{ fontSize: '20px', opacity: 0.9, margin: 0 }}>Please read these terms carefully</p>
          <p style={{ fontSize: '14px', opacity: 0.75, marginTop: '16px', margin: '16px 0 0 0' }}>Last updated: August 27, 2025</p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '48px 16px' }}>
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
          padding: '48px' 
        }}>
          
          {/* Agreement Notice */}
          <section style={{ marginBottom: '40px' }}>
            <div style={{ 
              backgroundColor: '#dbeafe', 
              borderLeft: '4px solid #3b82f6',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <p style={{ color: '#1f2937', fontWeight: '500', margin: 0 }}>
                By using CARTSMASH, you agree to these Terms and Conditions and our Privacy Policy. 
                If you don't agree, please don't use our service.
              </p>
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <section>
              <h2 style={headingStyle}>
                1. Agreement to Terms
              </h2>
              <div>
                <p style={textStyle}>
                  These Terms and Conditions ("Terms") govern your use of CARTSMASH ("we," "our," or "us") 
                  and our website located at cart-smash.vercel.app (the "Service") operated by CARTSMASH.
                </p>
                <p style={textStyle}>
                  By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
                  with any part of these terms, then you may not access the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                2. Description of Service
              </h2>
              <div>
                <p style={textStyle}>
                  CARTSMASH provides an AI-powered grocery list parsing and management service that includes:
                </p>
                <ul style={listStyle}>
                  <li>Intelligent parsing of grocery lists using AI</li>
                  <li>Shopping list organization and storage</li>
                  <li>Recipe management and ingredient extraction</li>
                  <li>Integration with Instacart and other retail partners for cart management</li>
                  <li>Cloud synchronization across devices</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                3. User Accounts
              </h2>
              <div>
                <p style={textStyle}>
                  When you create an account with us, you must provide information that is accurate, complete, 
                  and current at all times. You are responsible for safeguarding the password and for all activities 
                  that occur under your account.
                </p>
                <p style={textStyle}>
                  We reserve the right to refuse service, terminate accounts, or cancel orders in our sole discretion.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                4. Privacy Policy
              </h2>
              <div>
                <p style={textStyle}>
                  Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your 
                  information when you use our Service. By using our Service, you agree to the collection and use 
                  of information in accordance with our Privacy Policy.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                5. Prohibited Uses
              </h2>
              <div>
                <p style={textStyle}>You may not use our Service:</p>
                <ul style={listStyle}>
                  <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                  <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                  <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                  <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                  <li>To submit false or misleading information</li>
                  <li>To upload or transmit viruses or any other type of malicious code</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                6. Affiliate Relationships & Monetization
              </h2>
              <div>
                <p style={textStyle}>
                  <strong>Commercial Relationships:</strong> CARTSMASH participates in affiliate marketing programs
                  and earns commissions from purchases made through our platform. By using our Service, you acknowledge
                  and agree to these commercial relationships.
                </p>
                <ul style={listStyle}>
                  <li>We may receive compensation when you make purchases through Instacart or other partner integrations</li>
                  <li>These relationships help support our free service but do not affect pricing or our recommendations</li>
                  <li>We maintain editorial independence in our product recommendations and service features</li>
                  <li>All affiliate relationships are disclosed in accordance with FTC guidelines</li>
                </ul>
                <p style={textStyle}>
                  For complete details about our affiliate relationships, please review our Affiliate Disclosure page.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                7. Content
              </h2>
              <div>
                <p style={textStyle}>
                  Our Service allows you to post, link, store, share and otherwise make available certain information, 
                  text, graphics, videos, or other material ("Content"). You are responsible for the Content that you 
                  post to the Service.
                </p>
                <p style={textStyle}>
                  By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, 
                  publicly display, reproduce, and distribute such Content on and through the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                8. Termination
              </h2>
              <div>
                <p style={textStyle}>
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason 
                  whatsoever, including without limitation if you breach the Terms.
                </p>
                <p style={textStyle}>
                  Upon termination, your right to use the Service will cease immediately. If you wish to terminate your 
                  account, you may simply discontinue using the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                9. Disclaimer
              </h2>
              <div>
                <p style={textStyle}>
                  The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, 
                  this Company excludes all warranties, express or implied, including, without limitation, warranties of 
                  merchantability, fitness for a particular purpose, and non-infringement of intellectual property.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                10. Limitation of Liability
              </h2>
              <div>
                <p style={textStyle}>
                  In no event shall CARTSMASH, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                  be liable for any indirect, incidental, special, consequential, or punitive damages, including without 
                  limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use 
                  of the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                11. Changes to Terms
              </h2>
              <div>
                <p style={textStyle}>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision 
                  is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p style={textStyle}>
                  By continuing to access or use our Service after those revisions become effective, you agree to be bound 
                  by the revised terms.
                </p>
              </div>
            </section>

            <section>
              <h2 style={headingStyle}>
                12. Contact Information
              </h2>
              <div>
                <p style={textStyle}>
                  If you have any questions about these Terms and Conditions, please contact us at:
                </p>
                <p style={{ ...textStyle, fontWeight: '500' }}>
                  Email: legal@cartsmash.com
                </p>
              </div>
            </section>
          </div>

          {/* Footer Section */}
          <div style={{ 
            marginTop: '60px', 
            paddingTop: '20px', 
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              © 2025 CARTSMASH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;