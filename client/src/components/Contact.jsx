import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    window.history.back();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = () => {
    // Validate fields
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    // Create mailto link
    const mailtoLink = `mailto:support@cartsmash.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;
    window.location.href = mailtoLink;
    
    // Show success message
    setTimeout(() => {
      setSubmitStatus('success');
      setIsSubmitting(false);
      // Reset form after success
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' });
        setSubmitStatus(null);
      }, 3000);
    }, 1000);
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
            <p className="text-gray-600">
              We'd love to hear from you! Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  >
                    <option value="">Select a topic</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Kroger Integration">Kroger Integration</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="6"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </button>

                {submitStatus === 'success' && (
                  <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>Message prepared! Your email client should open now.</span>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>Failed to send message. Please email us directly.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
                <p className="text-gray-600 mb-6">
                  Have questions about CARTSMASH? We're here to help! Reach out to us through the contact form 
                  or use the information below.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-orange-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <a href="mailto:support@cartsmash.com" className="text-gray-600 hover:text-orange-500 transition-colors">
                      support@cartsmash.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <MessageSquare className="w-5 h-5 text-orange-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Response Time</h3>
                    <p className="text-gray-600">We typically respond within 24-48 hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Common Topics</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Kroger account connection issues</li>
                  <li>• AI parsing accuracy</li>
                  <li>• Recipe and meal plan management</li>
                  <li>• Account sync problems</li>
                  <li>• Feature requests and suggestions</li>
                  <li>• Bug reports and technical issues</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Legal & Policies</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/terms" className="text-orange-500 hover:text-orange-600 transition-colors">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.freeprivacypolicy.com/live/f3f10b15-024b-43c8-baa6-2e33642fafd5" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-600 transition-colors inline-flex items-center"
                    >
                      Privacy Policy
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Quick Tip</h3>
                <p className="text-sm text-gray-600">
                  For the fastest response, please include:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Your account email</li>
                  <li>• Description of the issue</li>
                  <li>• Steps to reproduce (for bugs)</li>
                  <li>• Screenshots if applicable</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;