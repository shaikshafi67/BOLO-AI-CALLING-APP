import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// The same Firebase project as the Flutter app (frontend/lib/firebase_options.dart),
// so both apps share accounts. These values identify the project; they are not secrets.
const useOwnAuthDomain = window.location.hostname !== 'localhost' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDPw-9h8PXRIeMIyLTeSfSXUZUEj_nmrw0',
  // On phones, Google sign-in runs on this site's own domain (helper files in
  // public/__/auth): mobile browsers block the cross-site hand-off with firebaseapp.com.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? (useOwnAuthDomain ? window.location.host : 'bolo-ai-8f1a0.firebaseapp.com'),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'bolo-ai-8f1a0',
  appId: '1:607547037853:web:9f00c534089f090d805c74',
  messagingSenderId: '607547037853',
  storageBucket: 'bolo-ai-8f1a0.firebasestorage.app',
});

export const auth = getAuth(app);
