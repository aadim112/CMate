// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, push, set } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDxV1Fw24Ho_Zayip4h9NjzOblCpwnk1M0",
  authDomain: "cmate-a3b60.firebaseapp.com",
  projectId: "cmate-a3b60",
  storageBucket: "cmate-a3b60.firebasestorage.app",
  messagingSenderId: "1095591193022",
  appId: "1:1095591193022:web:ae40dcf4cf5d647f24f1ef",
  measurementId: "G-BRK71FF9FH",
  databaseURL:'https://cmate-a3b60-default-rtdb.firebaseio.com/'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);


export { database, ref, push, set,auth};
