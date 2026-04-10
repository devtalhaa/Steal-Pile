import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  // Render puts "Secret Files" either in the root or in /etc/secrets/
  const renderSecretPath = path.join(process.cwd(), 'FIREBASE_SERVICE_ACCOUNT');
  const renderSecretAltPath = '/etc/secrets/FIREBASE_SERVICE_ACCOUNT';
  
  let initialized = false;

  // 1. Try Environment Variable first
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized via environment variable.");
      initialized = true;
    } catch (err) {
      console.error("FIREBASE_SERVICE_ACCOUNT variable found but invalid. Falling back...");
    }
  } 

  // 2. Try Render "Secret File" locations
  const possiblePaths = [renderSecretPath, renderSecretAltPath, serviceAccountPath];
  
  for (const p of possiblePaths) {
    if (!initialized && fs.existsSync(p)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log(`Firebase Admin initialized with file: ${p}`);
        initialized = true;
        break;
      } catch (err) {
        console.error(`Failed to read service account from ${p}:`, err);
      }
    }
  }

  // 3. Last resort fallback
  if (!initialized) {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'steal-game',
    });
    console.log("Firebase Admin initialized with projectId only (Limited Access).");
  }
}

export { admin };
