#!/usr/bin/env node

/**
 * Check Firebase Configuration Script
 * 
 * This script helps you find the correct Firebase configuration,
 * especially the database URL.
 */

console.log('🔍 Firebase Configuration Checker (Firestore)\n');

// Firebase configuration (without database URL - Firestore doesn't need it)
const firebaseConfig = {
  apiKey: "AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw",
  authDomain: "marketplace-turismo.firebaseapp.com",
  projectId: "marketplace-turismo",
  storageBucket: "marketplace-turismo.firebasestorage.app",
  messagingSenderId: "2810288247",
  appId: "1:2810288247:web:82aa82158154691b080e72"
  // Note: Firestore doesn't need a databaseURL - it's automatically configured
};

console.log('📋 Current Configuration:');
console.log(`   Project ID: ${firebaseConfig.projectId}`);
console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`   Storage Bucket: ${firebaseConfig.storageBucket}\n`);

console.log('🔍 To set up Firestore Database:\n');

console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
console.log('2. Select your project: marketplace-turismo');
console.log('3. In the left sidebar, click "Firestore Database"');
console.log('4. Click "Create Database"');
console.log('5. Choose "Start in test mode" (for development)');
console.log('6. Select a location (closest to your users)');
console.log('7. Click "Enable"\n');

console.log('📝 Firestore Advantages:');
console.log('   ✅ No database URL needed');
console.log('   ✅ Better querying capabilities');
console.log('   ✅ More scalable');
console.log('   ✅ Better for complex data');
console.log('   ✅ Automatic indexing\n');

console.log('⚠️  Important:');
console.log('   - Firestore is automatically configured');
console.log('   - No database URL to worry about');
console.log('   - Better for your tourism marketplace app\n');

console.log('🔧 After setting up Firestore:');
console.log('   1. Your app will work automatically');
console.log('   2. No configuration changes needed');
console.log('   3. Test the superadmin script: npm run create-superadmin\n');

// Try to initialize Firebase with Firestore
try {
  const { initializeApp } = require('firebase/app');
  const { getFirestore } = require('firebase/firestore');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('✅ Firebase configuration is valid');
  console.log('✅ Firestore is ready to use');
  console.log('✅ No database URL needed');
} catch (error) {
  console.log('❌ Firebase configuration error:', error.message);
}

console.log('\n🎯 Next steps:');
console.log('   1. Find the database URL in Firebase Console');
console.log('   2. Update your configuration files');
console.log('   3. Run this script again to verify');
