// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB5ZUtQpehwlwXMWTcP-DtzSLxRRDud054",
    authDomain: "passenger-booking-system-1212.firebaseapp.com",
    projectId: "passenger-booking-system-1212",
    storageBucket: "passenger-booking-system-1212.appspot.com",
    messagingSenderId: "541629107617",
    appId: "1:541629107617:web:75534810970836cc1f8fe0",
    measurementId: "G-JPSBQXPQ54"
};

let db, auth;

try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase Initialization Error:", e);
    const authStatusText = document.getElementById('auth-status-text');
    if(authStatusText) {
        authStatusText.textContent = `Помилка ініціалізації Firebase: ${e.message}`;
    }
}

export { db, auth, signInAnonymously, onAuthStateChanged };