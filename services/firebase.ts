import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB69m5pyBKWWQLho1xlyVRpT3L7nOI4UDg",
  authDomain: "laserspeed-pro.firebaseapp.com",
  projectId: "laserspeed-pro",
  storageBucket: "laserspeed-pro.firebasestorage.app",
  messagingSenderId: "989287528750",
  appId: "1:989287528750:web:d451ca56d6182d3186e2bf",
  measurementId: "G-HMKMS1Q7M8"
};

// Initialize Firebase (Singleton check)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// Enable offline persistence if possible
try {
    db.enablePersistence().catch((err) => {
        if (err.code == 'failed-precondition') {
             console.log("Persistence failed: Multiple tabs open");
        } else if (err.code == 'unimplemented') {
             console.log("Persistence not supported by browser");
        }
    });
} catch(e) {
    console.log("Persistence setup skipped");
}