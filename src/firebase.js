import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

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

// FCM is only supported in browsers with service worker support.
// Returns null in unsupported environments (Node.js, old Safari, etc.).
let _messaging = null
export const getMessagingInstance = async () => {
  if (_messaging) return _messaging
  try {
    const supported = await isSupported()
    if (!supported) return null
    _messaging = getMessaging(app)
    return _messaging
  } catch {
    return null
  }
}
