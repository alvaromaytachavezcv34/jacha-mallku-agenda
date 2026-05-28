// src/firebase.js
// ─────────────────────────────────────────────────────────────
// PASO: Reemplazá los valores de abajo con los de tu proyecto Firebase.
// Los obtenés en: https://console.firebase.google.com
//   → Tu proyecto → Configuración (⚙) → Tus apps → SDK de Firebase
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "PEGA_TU_apiKey_AQUI",
  authDomain:        "PEGA_TU_authDomain_AQUI",
  projectId:         "PEGA_TU_projectId_AQUI",
  storageBucket:     "PEGA_TU_storageBucket_AQUI",
  messagingSenderId: "PEGA_TU_messagingSenderId_AQUI",
  appId:             "PEGA_TU_appId_AQUI",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
