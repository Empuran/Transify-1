import { initializeApp, getApps, cert, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Use a global variable to persist across hot-reloads in development
const globalForFirebase = globalThis as unknown as {
    _firebaseAdminApp?: App;
};

function getAdminApp(): App {
    if (globalForFirebase._firebaseAdminApp) {
        return globalForFirebase._firebaseAdminApp;
    }

    // Clean up any existing apps to avoid conflicts during hot-reload
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    const app = initializeApp({ credential: cert(serviceAccount) });
    globalForFirebase._firebaseAdminApp = app;
    return app;
}

const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp, "transifydb");
