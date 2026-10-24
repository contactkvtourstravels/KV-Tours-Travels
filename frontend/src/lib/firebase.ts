"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "travel-agency-31216"}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "travel-agency-31216",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "travel-agency-31216"}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
}

function getFirebaseAppInstance(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseAppInstance();
  return getAuth(app);
}

export interface SocialAuthResult {
  idToken: string;
  provider: "google.com" | "apple.com";
  firstName?: string;
  lastName?: string;
  email?: string;
}

function parseDisplayName(displayName?: string | null): { firstName?: string; lastName?: string } {
  if (!displayName || !displayName.trim()) {
    return {};
  }
  const parts = displayName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

function mapAuthError(err: unknown): Error {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    switch (code) {
      case "auth/popup-closed-by-user":
        return new Error("Sign-in window was closed before completing.");
      case "auth/cancelled-popup-request":
        return new Error("Sign-in request was cancelled.");
      case "auth/popup-blocked":
        return new Error("Sign-in popup was blocked by your browser. Please allow popups for this site and retry.");
      case "auth/account-exists-with-different-credential":
        return new Error(
          "An account already exists with the same email using a different sign-in method. Please sign in with your original method."
        );
      case "auth/unauthorized-domain":
        return new Error(
          "This domain is not authorized for OAuth operations in your Firebase Console. Please add it to Authorized Domains."
        );
      case "auth/operation-not-allowed":
        return new Error(
          "This sign-in provider is not enabled in your Firebase Console Authentication settings."
        );
      case "auth/network-request-failed":
        return new Error("Network connection error. Please check your internet connection and try again.");
      default:
        if ("message" in err && typeof (err as { message: unknown }).message === "string") {
          return new Error((err as { message: string }).message);
        }
    }
  }
  if (err instanceof Error) return err;
  return new Error("Social authentication failed. Please try again.");
}

/**
 * Trigger official Google Sign-In popup via Firebase Authentication.
 */
export async function signInWithGoogle(): Promise<SocialAuthResult> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Google Sign-In is pending Firebase configuration. Please configure NEXT_PUBLIC_FIREBASE_API_KEY."
    );
  }

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  try {
    const credential: UserCredential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken();
    const { firstName, lastName } = parseDisplayName(credential.user.displayName);

    return {
      idToken,
      provider: "google.com",
      firstName,
      lastName,
      email: credential.user.email || undefined,
    };
  } catch (err: unknown) {
    throw mapAuthError(err);
  }
}

/**
 * Trigger official Apple Sign-In popup via Firebase Authentication OAuthProvider.
 */
export async function signInWithApple(): Promise<SocialAuthResult> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Apple Sign-In is pending Firebase configuration. Please configure NEXT_PUBLIC_FIREBASE_API_KEY."
    );
  }

  const auth = getFirebaseAuth();
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");

  try {
    const credential: UserCredential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken();

    // Apple only provides full name on the FIRST authorization via credential payload or user object
    const { firstName, lastName } = parseDisplayName(credential.user.displayName);

    return {
      idToken,
      provider: "apple.com",
      firstName,
      lastName,
      email: credential.user.email || undefined,
    };
  } catch (err: unknown) {
    throw mapAuthError(err);
  }
}
