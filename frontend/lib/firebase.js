import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

const firebaseConfig = {
  projectId: "focus-flow-72892",
  apiKey: "mock-key-for-emulator",
  authDomain: "focus-flow-72892.firebaseapp.com",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getDatabase(app);

// Connect to Local Emulators in development mode (if window exists for Next.js SSR safety)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Check if we haven't already connected
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    connectDatabaseEmulator(db, '127.0.0.1', 9000);
  }
}

export { app, auth, db, functions };
