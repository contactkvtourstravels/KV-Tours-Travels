"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { authApi, SafeUser, setSessionToken } from "@/lib/api";
import { signInWithGoogle, signInWithApple, isFirebaseConfigured } from "@/lib/firebase";

interface SocialAuthButtonsProps {
  onSuccess: (user: SafeUser) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: (momentListener?: (notification: Record<string, unknown>) => void) => void;
        };
      };
    };
  }
}

export function SocialAuthButtons({
  onSuccess,
  onError,
  disabled = false,
}: SocialAuthButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const isGisInitializedRef = useRef(false);

  // Keep stable callback references to prevent infinite/repeated re-initializations
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "786587181693-9m54fg2tp89kafu39f5qpki0p63ovm5q.apps.googleusercontent.com";

  const isBusy = disabled || googleLoading || appleLoading;

  // Single idempotent GIS initialization and render routine
  const initAndRenderGis = useCallback(() => {
    if (typeof window === "undefined" || !window.google?.accounts?.id || !googleClientId) return;
    try {
      if (!isGisInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) return;
            setGoogleLoading(true);
            try {
              const authResponse = await authApi.socialLogin({
                id_token: response.credential,
                provider: "google.com",
              });
              if (authResponse.access_token) {
                setSessionToken(authResponse.access_token);
              }
              onSuccessRef.current(authResponse.user);
            } catch (err: unknown) {
              if (err instanceof Error) {
                onErrorRef.current(err.message);
              } else {
                onErrorRef.current("Failed to authenticate with Google. Please try again.");
              }
            } finally {
              setGoogleLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        isGisInitializedRef.current = true;
      }

      if (googleBtnRef.current && googleBtnRef.current.childElementCount === 0) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          shape: "pill",
          theme: "outline",
          text: "continue_with",
          size: "large",
          logo_alignment: "left",
          width: googleBtnRef.current.offsetWidth || 340,
        });
        setGisLoaded(true);
      }
    } catch (err) {
      console.warn("Google Identity Services initialization warning:", err);
    }
  }, [googleClientId]);

  // Initialize Google Identity Services (GIS) once
  useEffect(() => {
    if (typeof window === "undefined" || !googleClientId) return;

    if (window.google?.accounts?.id) {
      initAndRenderGis();
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        initAndRenderGis();
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [googleClientId, initAndRenderGis]);

  const handleGoogleFallbackClick = async () => {
    if (isBusy) return;
    setGoogleLoading(true);

    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
        setGoogleLoading(false);
        return;
      }

      if (isFirebaseConfigured()) {
        const socialResult = await signInWithGoogle();
        const authResponse = await authApi.socialLogin({
          id_token: socialResult.idToken,
          provider: socialResult.provider,
          first_name: socialResult.firstName,
          last_name: socialResult.lastName,
        });
        if (authResponse.access_token) {
          setSessionToken(authResponse.access_token);
        }
        onSuccessRef.current(authResponse.user);
        return;
      }

      throw new Error(
        "Google Sign-In is initializing. Please wait a moment or check your internet connection."
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        onError(err.message);
      } else {
        onError("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (isBusy) return;
    setAppleLoading(true);

    try {
      if (!isFirebaseConfigured()) {
        throw new Error(
          "Apple Sign-In is awaiting configuration. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your deployment settings."
        );
      }

      const socialResult = await signInWithApple();
      const authResponse = await authApi.socialLogin({
        id_token: socialResult.idToken,
        provider: socialResult.provider,
        first_name: socialResult.firstName,
        last_name: socialResult.lastName,
      });

      onSuccess(authResponse.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        onError(err.message);
      } else {
        onError("Failed to sign in with Apple. Please try again.");
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Google Identity Services SDK Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          initAndRenderGis();
        }}
      />

      {/* Rendered Google Identity Services Button Container */}
      <div
        ref={googleBtnRef}
        className={
          gisLoaded
            ? "w-full flex justify-center [&>div]:!w-full [&_iframe]:!w-full min-h-[44px]"
            : "hidden"
        }
      />

      {/* Fallback Google Sign-In Button */}
      {!gisLoaded && (
        <button
          type="button"
          id="social-login-google-btn"
          onClick={handleGoogleFallbackClick}
          disabled={isBusy}
          aria-label="Continue with Google"
          className="w-full h-11 px-4 rounded-full border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] hover:border-[#9CA3AF] text-[#1F2937] text-xs font-semibold tracking-wide shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#4B5563]" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
      )}

      {/* Apple Sign-In Button */}
      <button
        type="button"
        id="social-login-apple-btn"
        onClick={handleAppleSignIn}
        disabled={isBusy}
        aria-label="Continue with Apple"
        className="w-full h-11 px-4 rounded-full border border-black bg-black hover:bg-[#1A1A1A] text-white text-xs font-semibold tracking-wide shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
      >
        {appleLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white/80" />
            <span>Connecting to Apple...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170" aria-hidden="true">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.77-8.8-10.42-19.04-13.94-30.71-3.52-11.67-5.28-22.68-5.28-33.04 0-14.42 3.63-26.6 10.89-36.54 7.26-9.94 16.59-15.01 27.99-15.22 5.26 0 11.05 1.41 17.37 4.24 6.32 2.83 10.37 4.29 12.16 4.39 1.48 0 5.8-1.56 12.98-4.68 7.18-3.12 13.43-4.43 18.77-3.92 14.07 1.19 24.97 6.47 32.71 15.86-12.44 7.52-18.52 17.75-18.25 30.71.27 10.19 4.15 18.66 11.64 25.41 7.49 6.75 16.32 10.59 26.5 11.51-2.12 6.53-4.63 12.87-7.53 19.03zM119.22 31.02c0-7.29 2.65-14.15 7.95-20.58 5.3-6.43 11.85-10.15 19.65-11.16.27 1.06.41 2.05.41 2.97 0 7.29-2.73 14.28-8.19 20.97-5.46 6.69-12.04 10.39-19.74 11.1-0.08-.85-.08-2.02-.08-3.3z" />
            </svg>
            <span>Continue with Apple</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center py-2">
        <div className="w-full border-t border-[#E4E5E7]" />
        <span className="absolute px-3 bg-white text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium">
          or continue with email
        </span>
      </div>
    </div>
  );
}
