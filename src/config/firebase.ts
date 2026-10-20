// Firebase settings for the shared database (MSP-45).
//
// These values come from the Firebase console (Project settings, Your apps,
// scoring-app). They are designed to be public: they only say which project
// to talk to. What anyone may read or change is decided by firestore.rules.
//
// While `projectId` is empty the app runs on this device only, exactly as it
// did before MSP-45. For local testing, run `npm run dev:cloud`, which points
// the app at the Firebase emulator instead of the real project.
export const firebaseConfig = {
  apiKey: 'AIzaSyChisiORLgWuKonQaDOSK4Ry0Bgq9E0DqA',
  authDomain: 'tac-mobile-scoring.firebaseapp.com',
  projectId: 'tac-mobile-scoring',
  storageBucket: 'tac-mobile-scoring.firebasestorage.app',
  messagingSenderId: '452981926064',
  appId: '1:452981926064:web:c71aceaaa913d672c0f375',
};

// The one competition document everything hangs off.
export const COMPETITION_DOC_ID = 'main';

// The staff passcode is the password of this Firebase sign in, set up by TAC
// in the Firebase console. The address is a placeholder, not a mailbox. The
// passcode itself never goes in the repo.
export const STAFF_EMAIL = 'staff@example.com';

// import.meta.env only exists inside the app (Vite). The scores script reads
// this file too, and passes --emulator itself.
const useEmulator = (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_EMULATOR === '1';

export const cloudSettings = {
  useEmulator,
  // "demo-" project IDs only ever talk to the emulator, never a real project.
  config: useEmulator ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-tac-scoring' } : firebaseConfig,
};

export const isCloudConfigured = (): boolean => cloudSettings.config.projectId !== '';
