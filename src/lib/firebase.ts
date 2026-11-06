/**
 * Firebase Client Configuration & Service Initializer
 * Provides Firestore & Google Authentication instances with Google Workspace Drive scopes.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore using the specific provisioned database ID if provided, otherwise default
const customDbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId;
export const db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Add Google Workspace Drive scopes
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

// In-memory caching for OAuth access token
let cachedAccessToken: string | null = null;

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || '';
  if (token) {
    cachedAccessToken = token;
  }
  return { user: result.user, accessToken: token };
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Test connection on boot per Firebase guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check your network or configuration.');
    }
    return false;
  }
}
