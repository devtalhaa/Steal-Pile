import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'steal-game' });
admin.auth().verifyIdToken('invalid_token').catch(e => console.error("SUCCESS ERROR", e.message));
