import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import * as fs from "fs"
import path from "path";

const firebaseConfig = {
  apiKey: "firebase_api_key",
  authDomain: "bio-heating.firebaseapp.com",
  projectId: "bio-heating",
  storageBucket: "bio-heating.appspot.com",
  messagingSenderId: "833855428298",
  appId: "1:833855428298:web:f501ea7154eb0966538633",
  measurementId: "G-Q6HD131V0H"
};

const data = fs.readFileSync(path.resolve(path.dirname(require.main.filename), './firebase_api_key.txt'), "utf-8")
firebaseConfig.apiKey = data;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app)

export { app, db }