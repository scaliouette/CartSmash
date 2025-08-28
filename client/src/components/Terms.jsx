import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    window.history.back();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
          <p className="text-gray-600 mb-8">Last updated: August 27, 2025</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
              <p>
                These Terms and Conditions ("Terms") govern your use of CARTSMASH ("we," "our," or "us") 
                and our website located at cart-smash.vercel.app (the "Service") operated by CARTSMASH.
              </p>
              <p className="mt-2">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
                with any part of these terms, then you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>
                CARTSMASH provides an AI-powered grocery list parsing and management service that includes:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Intelligent parsing of grocery lists using AI</li>
                <li>Shopping list organization and storage</li>
                <li>Recipe management and ingredient extraction</li>
                <li>Integration with Kroger for cart management</li>
                <li>Cloud synchronization across devices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, 
                and current at all times. You are responsible for safeguarding the password and for all 
                activities that occur under your account.
              </p>
              <p className="mt-2">
                You agree to notify us immediately of any unauthorized access to or use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Kroger Integration</h2>
              <p>
                Our Service integrates with Kroger's API to enable cart management features. By connecting 
                your Kroger account:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>You authorize us to access your Kroger account on your behalf</li>
                <li>You agree to Kroger's terms of service and privacy policy</li>
                <li>You understand that we do not store your Kroger login credentials</li>
                <li>You may disconnect your Kroger account at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Transmit any harmful or malicious content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the Service for any commercial purposes without our permission</li>
                <li>Reverse engineer or attempt to extract the source code of our Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by CARTSMASH 
                and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="mt-2">
                You retain ownership of any shopping lists, recipes, or other content you create using our Service. 
                By using our Service, you grant us a license to use, store, and display your content solely for 
                the purpose of providing the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Privacy</h2>
              <p>
                Your use of our Service is also governed by our Privacy Policy. Please review our Privacy Policy, 
                which also governs the Site and informs users of our data collection practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Disclaimer of Warranties</h2>
              <p>
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, 
                either express or implied. We do not warrant that:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>The Service will be uninterrupted or error-free</li>
                <li>The results obtained from the Service will be accurate or reliable</li>
                <li>Any errors in the Service will be corrected</li>
              </ul>
              <p className="mt-2">
                Grocery prices and product availability shown through our Service are estimates and may not 
                reflect actual store prices or availability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p>
                In no event shall CARTSMASH, its directors, employees, or agents be liable for any indirect, 
                incidental, special, consequential, or punitive damages arising out of or relating to your use 
                of the Service.
              </p>
              <p className="mt-2">
                Our total liability to you for any damages shall not exceed the amount of fifty dollars ($50.00) 
                or the amounts paid by you to us in the last six months, whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless CARTSMASH from any claims, damages, obligations, 
                losses, liabilities, costs, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Your use of and access to the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third party right</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, 
                for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
              <p className="mt-2">
                Upon termination, your right to use the Service will cease immediately. You may delete your 
                account at any time through the account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of California, 
                United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us at:</p>
              <div className="mt-2 pl-6">
                <p>CARTSMASH</p>
                <p>Email: support@cartsmash.com</p>
                <p>Website: cart-smash.vercel.app</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Entire Agreement</h2>
              <p>
                These Terms constitute the entire agreement between us regarding our Service and supersede 
                and replace any prior agreements we might have between us regarding the Service.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              By using CARTSMASH, you acknowledge that you have read and understood these Terms and Conditions 
              and agree to be bound by them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;