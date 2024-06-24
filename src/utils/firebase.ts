import admin from 'firebase-admin'

export const initFirebase = () => {
    const serviceAccount = require('../../src/data/firebase-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),        
      });
}