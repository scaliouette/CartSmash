// client/src/utils/testUtils.js
// Utility functions for testing the enhanced checkout

// Test function to trigger enhanced checkout demo
export const testEnhancedCheckout = () => {
  console.log('🚀 Opening Enhanced Checkout Demo...');
  // Change URL to trigger view change
  if (window.setCurrentView) {
    window.setCurrentView('enhanced-checkout');
  } else {
    console.log('💡 To test enhanced checkout:');
    console.log('1. Open browser console on CartSmash homepage');
    console.log('2. Run: testEnhancedCheckout()');
    console.log('3. Or manually set currentView to "enhanced-checkout"');
  }
};

// Make it globally available for testing
if (typeof window !== 'undefined') {
  window.testEnhancedCheckout = testEnhancedCheckout;
}

export default { testEnhancedCheckout };