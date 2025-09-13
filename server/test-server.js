// Simple test to verify server structure
const express = require('express');

// Test if all route files can be loaded
try {
  console.log('Testing route file imports...');
  
  const pensRouter = require('./routes/pens');
  console.log('✅ Pens router loaded');
  
  const weightsRouter = require('./routes/weights');
  console.log('✅ Weights router loaded');
  
  const breedingRouter = require('./routes/breeding');
  console.log('✅ Breeding router loaded');
  
  const healthRouter = require('./routes/health');
  console.log('✅ Health router loaded');
  
  const investorsRouter = require('./routes/investors');
  console.log('✅ Investors router loaded');
  
  const feedRouter = require('./routes/feed');
  console.log('✅ Feed router loaded');
  
  const notificationsRouter = require('./routes/notifications');
  console.log('✅ Notifications router loaded');
  
  const reportsRouter = require('./routes/reports');
  console.log('✅ Reports router loaded');
  
  console.log('\n🎉 All route modules loaded successfully!');
  console.log('✅ Server structure is valid and ready for deployment');
  
} catch (error) {
  console.error('❌ Error loading route modules:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Test middleware imports
try {
  const authMiddleware = require('./middleware/auth');
  console.log('✅ Auth middleware loaded');
  
  const validationMiddleware = require('./middleware/validation');
  console.log('✅ Validation middleware loaded');
  
} catch (error) {
  console.error('❌ Error loading middleware:', error.message);
  process.exit(1);
}

console.log('\n🚀 Server structure test completed successfully!');
console.log('Ready to start the full server with: npm run dev');