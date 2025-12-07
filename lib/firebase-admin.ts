import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Get environment variables
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  console.log('🔍 Firebase initialization check:');
  console.log('  - FIREBASE_PROJECT_ID:', projectId ? '✓ set' : '✗ missing');
  console.log('  - FIREBASE_CLIENT_EMAIL:', clientEmail ? '✓ set' : '✗ missing');
  console.log('  - FIREBASE_PRIVATE_KEY:', privateKey ? `✓ set (${privateKey.length} chars)` : '✗ missing');
  
  // Check if we have all required credentials
  if (!privateKey || !projectId || !clientEmail) {
    console.error('❌ Missing required Firebase environment variables:');
    if (!projectId) console.error('  - FIREBASE_PROJECT_ID is missing');
    if (!clientEmail) console.error('  - FIREBASE_CLIENT_EMAIL is missing');
    if (!privateKey) console.error('  - FIREBASE_PRIVATE_KEY is missing');
    throw new Error('Firebase configuration is incomplete. Please set all required environment variables in Render dashboard.');
  }

  // Handle private key formatting - replace literal \n with actual newlines
  // This is needed because Render might store the key with escaped newlines
  if (privateKey.includes('\\n')) {
    console.log('  - Replacing \\n with actual newlines in private key');
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  if (privateKey) {
    console.log('  - Private key starts with:', privateKey.substring(0, 30));
    console.log('  - Private key ends with:', privateKey.substring(privateKey.length - 30));
    console.log('  - Private key contains newlines:', privateKey.includes('\n') ? 'Yes' : 'No');
  }

  try {
    const credential = admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    });

    admin.initializeApp({
      credential: credential,
      projectId: projectId, // Explicitly set projectId here too
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('  - Project ID:', admin.app().options.projectId);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const auth = admin.auth();
export default admin;
