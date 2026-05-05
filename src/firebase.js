import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDqOPeNh7ElrhYXsGY7I3-xDt4U1qGoGEo",
  authDomain: "chandra-app-35537.firebaseapp.com",
  projectId: "chandra-app-35537",
  storageBucket: "chandra-app-35537.firebasestorage.app",
  messagingSenderId: "1081964756674",
  appId: "1:1081964756674:web:b3c20b2292f3d1dfebc55b"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
