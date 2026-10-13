// Firebase settings for the shared database (MSP-45).
//
// These values come from the Firebase console (Project settings, Your apps,
// scoring-web). They are designed to be public: they only say which project
// to talk to. What anyone may read or change is decided by firestore.rules.
//
// While `projectId` is empty the app runs on this device only, exactly as it
// did before MSP-45. For local testing, run `npm run dev:cloud`, which points
// the app at the Firebase emulator instead of the real project.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// The one competition document everything hangs off.
export const COMPETITION_DOC_ID = 'main';

// The staff passcode is the password of this Firebase sign in, set up by TAC
// in the Firebase console. The address is a placeholder, not a mailbox. The
// passcode itself never goes in the repo.
export const STAFF_EMAIL = 'staff@example.com';

const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';

export const cloudSettings = {
  useEmulator,
  // "demo-" project IDs only ever talk to the emulator, never a real project.
  config: useEmulator ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-tac-scoring' } : firebaseConfig,
};

export const isCloudConfigured = (): boolean => cloudSettings.config.projectId !== '';
