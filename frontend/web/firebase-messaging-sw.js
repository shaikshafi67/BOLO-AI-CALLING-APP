// Shows incoming-call pushes while the BoloAI tab is closed (see
// lib/services/push_service.dart). Only used when the app is built with
// --dart-define=BOLOAI_FCM_VAPID_KEY=... ; the config matches the web app in
// lib/firebase_options.dart. Version matches firebase_core_web's JS SDK.
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDPw-9h8PXRIeMIyLTeSfSXUZUEj_nmrw0',
  appId: '1:607547037853:web:9f00c534089f090d805c74',
  messagingSenderId: '607547037853',
  projectId: 'bolo-ai-8f1a0',
  authDomain: 'bolo-ai-8f1a0.firebaseapp.com',
  storageBucket: 'bolo-ai-8f1a0.firebasestorage.app',
});

// Notification pushes are displayed by the browser automatically.
firebase.messaging();

// Tapping the notification opens (or focuses) BoloAI; the open app then
// receives the still-ringing call over its socket.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) return w.focus();
      }
      return clients.openWindow('/');
    }),
  );
});
