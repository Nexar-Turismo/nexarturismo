#!/usr/bin/env node

/**
 * Create Superadmin User Script
 * 
 * This script creates a superadmin user in Firebase Authentication and Database.
 * Run this script to set up the first superadmin user for your MKT Turismo application.
 * 
 * Usage:
 * node scripts/create-superadmin.js
 * 
 * The script will prompt for:
 * - Email address
 * - Password
 * - Full name
 * - Phone number (optional)
 */

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc 
} = require('firebase/firestore');
const readline = require('readline');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw",
  authDomain: "marketplace-turismo.firebaseapp.com",
  projectId: "marketplace-turismo",
  storageBucket: "marketplace-turismo.firebasestorage.app",
  messagingSenderId: "2810288247",
  appId: "1:2810288247:web:82aa82158154691b080e72"
  // Note: Firestore doesn't need a databaseURL - it's automatically configured
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Firestore database

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to prompt for user input
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true };
}

// Create superadmin user
async function createSuperadminUser() {
  try {
    console.log('\n🚀 MKT Turismo - Create Superadmin User\n');
    console.log('This script will create a superadmin user with full system access.\n');

    // Get user input
    const email = await question('📧 Email address: ');
    
    if (!isValidEmail(email)) {
      console.error('❌ Invalid email format. Please enter a valid email address.');
      rl.close();
      return;
    }

    const password = await question('🔒 Password (min 6 characters): ');
    const passwordValidation = validatePassword(password);
    
    if (!passwordValidation.valid) {
      console.error(`❌ ${passwordValidation.message}`);
      rl.close();
      return;
    }

    const confirmPassword = await question('🔒 Confirm password: ');
    
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match.');
      rl.close();
      return;
    }

    const name = await question('👤 Full name: ');
    
    if (!name.trim()) {
      console.error('❌ Name is required.');
      rl.close();
      return;
    }

    const phone = await question('📱 Phone number (optional, press Enter to skip): ');
    
    console.log('\n📋 Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Phone: ${phone || 'Not provided'}`);
    console.log(`   Role: Superadmin (full system access)`);
    
    const confirm = await question('\n❓ Proceed with creating superadmin user? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled.');
      rl.close();
      return;
    }

    console.log('\n⏳ Creating superadmin user...');

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName: name });

    // Create user document in database
    const superadminRole = {
      roleId: 'role_superadmin',
      roleName: 'superadmin',
      assignedAt: new Date(),
      isActive: true,
    };

    const userData = {
      id: user.uid,
      name: name,
      email: email,
      phone: phone || '',
      avatar: '',
      roles: [superadminRole],
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      profileCompleted: true,
    };

    // Save to database
    await setDoc(doc(db, `users/${user.uid}`), userData);

    console.log('\n✅ Superadmin user created successfully!');
    console.log('\n📊 User Details:');
    console.log(`   User ID: ${user.uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: Superadmin`);
    console.log(`   Status: Active`);
    
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${'*'.repeat(password.length)}`);
    
    console.log('\n⚠️  Important Notes:');
    console.log('   - This user has full system access');
    console.log('   - Store credentials securely');
    console.log('   - You can now log in to the application');
    console.log('   - Use this account to manage other users and roles');
    
    console.log('\n🎉 Setup complete! You can now run your application.');

  } catch (error) {
    console.error('\n❌ Error creating superadmin user:');
    
    if (error.code === 'auth/email-already-in-use') {
      console.error('   Email is already registered. Please use a different email address.');
    } else if (error.code === 'auth/invalid-email') {
      console.error('   Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      console.error('   Password is too weak.');
    } else if (error.code === 'auth/operation-not-allowed') {
      console.error('   Email/password accounts are not enabled. Please check Firebase configuration.');
    } else {
      console.error('   Technical error:', error.message);
      console.error('   Full error:', error);
    }
  } finally {
    rl.close();
  }
}

// Handle script execution
if (require.main === module) {
  createSuperadminUser().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createSuperadminUser };
