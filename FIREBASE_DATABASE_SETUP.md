# Firebase Realtime Database Setup

This guide will help you set up the Firebase Realtime Database and fix the database URL error you encountered.

## 🚨 Error Fix

The error you saw:
```
FIREBASE WARNING: Firebase error. Please ensure that you have the URL of your Firebase Realtime Database instance configured correctly.
```

This happens because the Realtime Database hasn't been created in your Firebase project yet.

## 🔧 Step-by-Step Setup

### 1. Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `marketplace-turismo`

### 2. Create Realtime Database
1. In the left sidebar, click **Realtime Database**
2. Click **Create Database**
3. Choose a location (select the closest to your users)
4. Click **Next**

### 3. Set Security Rules
1. Choose **Start in test mode** (for development)
2. Click **Enable**
3. **Important**: You'll see a warning about test mode - this is fine for development

### 4. Get the Database URL
1. After creation, you'll see your database
2. The URL will be displayed at the top
3. It should look like: `https://marketplace-turismo.firebaseio.com`
4. **Note**: It's NOT `https://marketplace-turismo-default-rtdb.firebaseio.com`

## 📝 Update Configuration

### Option 1: Environment Variables (Recommended)
Create a `.env.local` file in your project root:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=marketplace-turismo.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=marketplace-turismo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marketplace-turismo.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=2810288247
NEXT_PUBLIC_FIREBASE_APP_ID=1:2810288247:web:82aa82158154691b080e72
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://marketplace-turismo.firebaseio.com
```

### Option 2: Update Code Directly
If you prefer to hardcode the URL, update these files:

**`src/lib/firebase.ts`:**
```typescript
databaseURL: "https://marketplace-turismo.firebaseio.com"
```

**`scripts/create-superadmin.js`:**
```javascript
databaseURL: "https://marketplace-turismo.firebaseio.com"
```

## 🔒 Security Rules Setup

After creating the database, update the security rules:

1. In Firebase Console → Realtime Database → Rules
2. Replace the default rules with:

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

3. Click **Publish**

## ✅ Verification Steps

### 1. Check Database URL
- Go to Firebase Console → Realtime Database
- Verify the URL matches what you have in your code
- It should be: `https://marketplace-turismo.firebaseio.com`

### 2. Test Connection
- Restart your development server: `npm run dev`
- Check the browser console for Firebase errors
- The database warning should be gone

### 3. Test Superadmin Creation
- Run the superadmin script again: `npm run create-superadmin`
- It should work without database errors

## 🚀 Alternative: Use Firestore

If you prefer Firestore over Realtime Database:

1. **Go to Firestore Database** in Firebase Console
2. **Create database** in test mode
3. **Update your code** to use Firestore instead:

```typescript
// In src/lib/firebase.ts
import { getFirestore } from 'firebase/firestore';

export const db = getFirestore(app);
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Database not found"
- Ensure you created the Realtime Database (not Firestore)
- Check the project ID matches exactly
- Verify you're in the correct Firebase project

#### 2. "Permission denied"
- Check security rules are set to test mode
- Ensure rules allow read/write access
- Verify authentication is working

#### 3. "Invalid database URL"
- Remove any extra characters from the URL
- Ensure the format is: `https://PROJECT_ID.firebaseio.com`
- Check for typos in the project ID

#### 4. "CORS errors"
- This usually means the database URL is wrong
- Double-check the URL format
- Ensure you're using the correct project

### Debug Steps

1. **Check Firebase Console**:
   - Verify database exists
   - Check the exact URL
   - Ensure project ID matches

2. **Check Your Code**:
   - Verify databaseURL in firebase.ts
   - Check for typos
   - Ensure no extra spaces

3. **Check Environment Variables**:
   - Verify .env.local exists
   - Check variable names (NEXT_PUBLIC_ prefix)
   - Restart dev server after changes

4. **Check Network Tab**:
   - Open browser dev tools
   - Look for failed requests to Firebase
   - Check the exact URLs being called

## 📚 Additional Resources

- [Firebase Realtime Database Documentation](https://firebase.google.com/docs/database)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [Firebase Console Guide](https://firebase.google.com/docs/console)

## 🆘 Still Having Issues?

If you continue to have problems:

1. **Double-check the project ID**: `marketplace-turismo`
2. **Verify database creation**: Must be Realtime Database, not Firestore
3. **Check URL format**: `https://PROJECT_ID.firebaseio.com`
4. **Restart everything**: Dev server, terminal, browser
5. **Clear browser cache**: Hard refresh (Ctrl+F5)

The most common cause is that the database simply hasn't been created yet in Firebase Console. Once you create it, the error should disappear.
