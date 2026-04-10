import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  
  // 1. Try Environment Variable first (For Vercel/Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized via environment variable.");
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err);
    }
  } 
  // 2. Fallback to local file (For Local Development)
  else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized with local service-account.json.");
  } else {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'steal-game',
    });
    console.log("Firebase Admin initialized with projectId only (Limited Access).");
  }
}

export { admin };
