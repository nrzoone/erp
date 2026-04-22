import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBWjr3ad9H821NvY9okMxpLQwSPGeP-RlE",
    authDomain: "nrzone-erp.firebaseapp.com",
    projectId: "nrzone-erp",
    storageBucket: "nrzone-erp.firebasestorage.app",
    messagingSenderId: "973006454627",
    appId: "1:973006454627:web:e1c76ae963ebf843139d56",
    measurementId: "G-TT4TFGSPJK"
};

// Initialize Firebase with safety check
let app;
try {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
        console.error("❌ CRITICAL: Firebase API Key is missing or invalid!");
    } else {
        console.log("🔥 Initializing Firebase...");
        app = initializeApp(firebaseConfig);
    }
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
}

// Initialize Services
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const analytics = (typeof window !== "undefined" && app) ? getAnalytics(app) : null;

export default app;
