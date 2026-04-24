import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const credential = serviceAccountJson 
      ? admin.credential.cert(JSON.parse(serviceAccountJson))
      : admin.credential.applicationDefault();

    admin.initializeApp({
      credential,
      projectId: "rfitracker",
    });
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error);
  }
}

const db = admin.firestore();

export { admin, db as adminDb };
