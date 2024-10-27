import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "firebase_api_key",
  authDomain: "bio-heating.firebaseapp.com",
  projectId: "bio-heating",
  storageBucket: "bio-heating.appspot.com",
  messagingSenderId: "833855428298",
  appId: "1:833855428298:web:f501ea7154eb0966538633",
  measurementId: "G-Q6HD131V0H"
};

const google_auth = new GoogleAuthProvider()

if (location.hostname === "localhost" || location.hostname === "127.0.0.1")
{
  const response = await fetch("/firebase_api_key.txt");
  const text = await response.text();
  firebaseConfig.apiKey = text;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const auth = getAuth(app)

export {app, db, auth, google_auth, signInWithPopup, signOut }