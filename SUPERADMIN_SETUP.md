# Superadmin User Setup

This guide explains how to create the first superadmin user for your MKT Turismo application.

## 🎯 What is a Superadmin?

A superadmin user has full system access and can:
- Manage all users and their roles
- Moderate and approve/reject posts
- Access system analytics and settings
- Assign and remove roles from other users
- View and manage all system data

## 🚀 Quick Setup

### Option 1: Using npm script (Recommended)

```bash
npm run create-superadmin
```

### Option 2: Direct Node.js execution

```bash
node scripts/create-superadmin.js
```

### Option 3: Platform-specific scripts

**Linux/Mac:**
```bash
./scripts/create-superadmin.sh
```

**Windows:**
```bash
scripts/create-superadmin.bat
```

## 📋 Prerequisites

Before running the script, ensure you have:

1. **Node.js installed** (version 16 or higher)
2. **Firebase dependencies installed** (`npm install` completed)
3. **Firebase project configured** with Authentication and Realtime Database enabled
4. **Email/Password authentication enabled** in Firebase Console

## 🔧 Firebase Console Setup

### 1. Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `marketplace-turismo`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Email/Password** provider
5. Save changes

### 2. Enable Realtime Database
1. Navigate to **Realtime Database**
2. Create database if not exists
3. Start in **test mode** for development (you can secure it later)
4. Note the database URL (should match the one in the script)

### 3. Database Rules (Optional but Recommended)
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('roles').child('role_superadmin').exists()",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('roles').child('role_superadmin').exists()"
      }
    },
    "posts": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('roles').child('role_publisher').exists() || root.child('users').child(auth.uid).child('roles').child('role_superadmin').exists())"
    }
  }
}
```

## 📝 Script Execution

When you run the script, it will prompt you for:

1. **Email Address**: The email for the superadmin account
2. **Password**: Minimum 6 characters
3. **Confirm Password**: Must match the first password
4. **Full Name**: Display name for the superadmin
5. **Phone Number**: Optional contact information
6. **Confirmation**: Review and confirm the details

## 🔐 Example Session

```bash
$ npm run create-superadmin

🚀 MKT Turismo - Create Superadmin User

This script will create a superadmin user with full system access.

📧 Email address: admin@mkt-turismo.com
🔒 Password (min 6 characters): SuperAdmin123!
🔒 Confirm password: SuperAdmin123!
👤 Full name: System Administrator
📱 Phone number (optional, press Enter to skip): +34 600 123 456

📋 Summary:
   Email: admin@mkt-turismo.com
   Name: System Administrator
   Phone: +34 600 123 456
   Role: Superadmin (full system access)

❓ Proceed with creating superadmin user? (yes/no): yes

⏳ Creating superadmin user...

✅ Superadmin user created successfully!

📊 User Details:
   User ID: abc123def456ghi789
   Email: admin@mkt-turismo.com
   Name: System Administrator
   Role: Superadmin
   Status: Active

🔐 Login Credentials:
   Email: admin@mkt-turismo.com
   Password: ***************

⚠️  Important Notes:
   - This user has full system access
   - Store credentials securely
   - You can now log in to the application
   - Use this account to manage other users and roles

🎉 Setup complete! You can now run your application.
```

## 🛡️ Security Considerations

### 1. Password Strength
- Use a strong, unique password
- Minimum 6 characters (Firebase requirement)
- Consider using a password manager

### 2. Account Protection
- Enable 2-factor authentication if possible
- Use a dedicated email for admin purposes
- Regularly rotate passwords

### 3. Access Control
- Limit superadmin access to trusted personnel
- Use role-based access for other administrators
- Monitor superadmin account usage

## 🔍 Troubleshooting

### Common Issues

#### 1. "Email is already registered"
- The email is already in use
- Use a different email address
- Or reset the existing account password

#### 2. "Password is too weak"
- Ensure password is at least 6 characters
- Firebase has minimum security requirements

#### 3. "Email/password accounts are not enabled"
- Go to Firebase Console → Authentication → Sign-in method
- Enable Email/Password provider

#### 4. "Database permission denied"
- Check Firebase Realtime Database rules
- Ensure database exists and is accessible
- Verify database URL in the script

#### 5. "Node.js not found"
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Ensure it's in your system PATH
- Restart terminal after installation

### Debug Mode

To see detailed error information, you can modify the script to add more logging:

```javascript
// Add this line at the top of the script
process.env.DEBUG = 'firebase:*';
```

## 🔄 Post-Setup Steps

After creating the superadmin user:

1. **Test Login**: Log in to your application with the new credentials
2. **Verify Access**: Check that you can access admin features
3. **Create Additional Users**: Use the superadmin account to create other users
4. **Assign Roles**: Give appropriate roles to team members
5. **Secure Database**: Update Firebase security rules for production

## 📚 Related Documentation

- [Role-Based Access Control System](ROLE_SYSTEM_README.md)
- [Firebase Setup Guide](https://firebase.google.com/docs)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Verify Firebase configuration
3. Check Node.js and npm versions
4. Review Firebase Console settings
5. Check application logs for errors

## 🔐 Default Superadmin Credentials

**⚠️ IMPORTANT**: Change these credentials after first login!

- **Email**: admin@mkt-turismo.com
- **Password**: SuperAdmin123!
- **Role**: Superadmin
- **Access**: Full system control

---

**Note**: This script should only be run once to create the initial superadmin user. For additional superadmin users, use the application's role management interface.
