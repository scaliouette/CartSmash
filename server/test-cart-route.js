try {
  console.log('Testing cart route loading...');
  const cartRoute = require('./routes/cart');
  console.log('✅ Cart route loaded successfully');
  console.log('Type:', typeof cartRoute);
  console.log('Available methods:', Object.keys(cartRoute));
} catch (error) {
  console.error('❌ Error loading cart route:');
  console.error(error.message);
  console.error('Stack trace:');
  console.error(error.stack);
}