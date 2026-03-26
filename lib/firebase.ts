import { initializeApp, getApps, getApp } from "firebase/app"

import {

    getAuth,

    signInWithCustomToken,

    signInAnonymously,

    RecaptchaVerifier,

    signInWithPhoneNumber,

    PhoneAuthProvider

} from "firebase/auth"

import { getFirestore } from "firebase/firestore"

import { getStorage } from "firebase/storage"
 
// UPDATED: Now matches your new google-services.json for Android

const firebaseConfig = {

    apiKey: "AIzaSyDlUuJeaur7dU3_o2psx7dYL8iwjBpeNCQ", // New key from JSON

    authDomain: "transify-6b187.firebaseapp.com",

    projectId: "transify-6b187",

    storageBucket: "transify-6b187.firebasestorage.app",

    messagingSenderId: "959857613661",

    appId: "1:959857613661:android:81312f7402e790bee826b4", // Android-specific App ID

    measurementId: "G-VCW9DLE80N"

}
 
// Initialize Firebase with the named database 'transifydb'

const getFirebaseInstances = () => {

    try {

        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

        const auth = getAuth(app)

        const db = getFirestore(app, "transifydb") // Using your specific database

        const storage = getStorage(app)

        return { app, auth, db, storage }

    } catch (error) {

        console.error("Firebase initialization failed:", error)

        return {

            app: {} as any,

            auth: {} as any,

            db: null as any,

            storage: {} as any

        }

    }

}
 
const { app, auth, db, storage } = getFirebaseInstances()
 
export {

    app, auth, db, storage,

    signInWithCustomToken,

    signInAnonymously,

    RecaptchaVerifier,

    signInWithPhoneNumber,

    PhoneAuthProvider

}
 