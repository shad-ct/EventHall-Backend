import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  console.log('🔍 Firebase initialization check:');
  console.log('  - FIREBASE_PROJECT_ID:', projectId ? '✓ set' : '✗ missing');
  console.log('  - FIREBASE_CLIENT_EMAIL:', clientEmail ? '✓ set' : '✗ missing');
  console.log('  - FIREBASE_PRIVATE_KEY:', privateKey ? `✓ set (${privateKey.length} chars)` : '✗ missing');
  
  if (privateKey) {
    console.log('  - Private key starts with:', privateKey.substring(0, 30));
    console.log('  - Private key ends with:', privateKey.substring(privateKey.length - 30));
  }
  
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const auth: ReturnType<typeof admin.auth> = admin.auth();
export default admin;
