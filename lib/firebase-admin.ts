import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  // Check if we have all required credentials
  const hasRequiredCreds = privateKey && projectId && clientEmail;
  
  if (!hasRequiredCreds) {
    console.error('❌ Missing required Firebase environment variables:');
    if (!projectId) console.error('  - FIREBASE_PROJECT_ID');
    if (!clientEmail) console.error('  - FIREBASE_CLIENT_EMAIL');
    if (!privateKey) console.error('  - FIREBASE_PRIVATE_KEY');
    throw new Error('Firebase configuration is incomplete. Please set all required environment variables.');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export const auth: ReturnType<typeof admin.auth> = admin.auth();
export default admin;
