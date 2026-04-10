import * as admin from 'firebase-admin';

// We initialize admin with simply the projectId to verify tokens.
// No private key is needed to verify Firebase ID tokens!
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'steal-game',
  });
}

export { admin };
