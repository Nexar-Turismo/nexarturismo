import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "marketplace-turismo",
  // Use service account key if available, otherwise use default credentials
  ...(process.env.FIREBASE_SERVICE_ACCOUNT_KEY && {
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  })
};

// Initialize Firebase Admin app (only if not already initialized)
const adminApp = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];

// Export Firebase Admin Auth
export const adminAuth = getAuth(adminApp);

export default adminApp;
