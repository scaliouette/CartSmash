import React, { useEffect } from 'react';
import { ArrowLeft, ExternalLink, Shield, Lock, Eye, Database } from 'lucide-react';

const Privacy = () => {
  useEffect(() => {
    // Option 1: Auto-redirect to external privacy policy
    // Uncomment this if you want automatic redirect
    // window.location.href = 'https://www.freeprivacypolicy.com/live/f3f10b15-024b-43c8-baa6-2e33642fafd5';
    
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    window.history.back();
  };

  const handleViewPrivacyPolicy = () => {
    window.open('https://www.freeprivacypolicy.com/live/f3f10b15-024b-43c8-baa6-2e33642fafd5', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={handleBack}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to CARTSMASH
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">
              Your privacy is important to us
            </p>
          </div>

          {/* Summary Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy at a Glance</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start">
                  <Lock className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Data Security</h3>
                    <p className="text-sm text-gray-600">
                      We use encryption and secure connections to protect your grocery lists and personal information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-start">
                  <Eye className="w-5 h-5 text-green-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">No Data Selling</h3>
                    <p className="text-sm text-gray-600">
                      We never sell your personal information or shopping data to third parties.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-start">
                  <Database className="w-5 h-5 text-purple-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Your Control</h3>
                    <p className="text-sm text-gray-600">
                      You can access, export, or delete your data at any time through your account settings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-orange-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Third-Party Integration</h3>
                    <p className="text-sm text-gray-600">
                      When you connect Kroger, we only store OAuth tokens, never your passwords.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Information */}
          <div className="space-y-6 mb-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">What We Collect</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Account information (email, name) when you sign up</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Shopping lists and grocery items you create</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Recipes and meal plans you save</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Kroger OAuth tokens (not passwords) if you connect your account</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use It</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>To provide and improve our AI-powered grocery parsing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>To sync your data across devices</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>To send your shopping lists to Kroger when you request it</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>To save your preferences and improve your experience</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Access all your data at any time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Export your lists and recipes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Delete your account and all associated data</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Disconnect third-party integrations</span>
                </li>
              </ul>
            </section>
          </div>

          {/* Call to Action */}
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">View Full Privacy Policy</h2>
            <p className="text-gray-600 mb-4">
              For complete details about how we collect, use, and protect your information, 
              please view our comprehensive privacy policy.
            </p>
            <button
              onClick={handleViewPrivacyPolicy}
              className="inline-flex items-center bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              View Full Privacy Policy
              <ExternalLink className="w-5 h-5 ml-2" />
            </button>
            <p className="text-sm text-gray-500 mt-3">
              Opens in a new window
            </p>
          </div>

          {/* Contact Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="text-center">
              <p className="text-gray-600 mb-2">Have questions about your privacy?</p>
              <a 
                href="/contact" 
                className="text-orange-500 hover:text-orange-600 font-semibold transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;