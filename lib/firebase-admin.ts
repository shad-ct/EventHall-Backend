import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  // Only initialize if we have real credentials
  if (privateKey && privateKey.includes('BEGIN PRIVATE KEY') && projectId && clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Development mode: Initialize without real credentials
    console.log('⚠️  Firebase Admin SDK running in development mode without real credentials');
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (error) {
      console.log('⚠️  Using mock Firebase - some features require real credentials');
    }
  }
}

export const auth: ReturnType<typeof admin.auth> = admin.auth();
export default admin;
