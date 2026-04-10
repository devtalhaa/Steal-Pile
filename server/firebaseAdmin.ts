import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized with service account.");
  } else {
    // Fallback for simple token verification if no service account is found
    admin.initializeApp({
      projectId: 'steal-game',
    });
    console.log("Firebase Admin initialized with projectId only (Limited Access).");
  }
}

export { admin };
