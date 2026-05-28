import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfmFsnrDy-h2O3Y2p90fPhZiKtTQv8QU8",
  authDomain: "jacha-mallku.firebaseapp.com",
  projectId: "jacha-mallku",
  storageBucket: "jacha-mallku.firebasestorage.app",
  messagingSenderId: "219658692884",
  appId: "1:219658692884:web:423e6f904773e563f03a01"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
