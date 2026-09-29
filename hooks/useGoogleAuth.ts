import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getGoogleClientId, getIosGoogleClientId } from "@/src/config/resolvedAppConfig";

/**
 * Set to true in __DEV__ to simulate getTokens() failing (reproduces Play Store token issue).
 * MUST remain false in committed code.
 */
const SIMULATE_TOKEN_FAILURE = __DEV__ && false;

function sanitizeClientId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useGoogleAuth() {
  const googleConfigErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    try {
      const webClientId = sanitizeClientId(getGoogleClientId());
      const iosClientId = sanitizeClientId(getIosGoogleClientId());
      const configurePayload = {
        ...(webClientId ? { webClientId } : {}),
        // iOS requires a separate OAuth client ID (iOS type) from Google Cloud Console.
        ...(Platform.OS === "ios" && iosClientId ? { iosClientId } : {}),
        scopes: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/contacts.readonly",
        ],
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      };

      if (!webClientId && Platform.OS === "ios" && !iosClientId) {
        googleConfigErrorRef.current = new Error("Google Sign-In is not configured for iOS.");
        console.warn("[useGoogleAuth] Missing webClientId/iosClientId for iOS.");
        return;
      }

      GoogleSignin.configure(configurePayload);
      googleConfigErrorRef.current = null;
    } catch (err) {
      googleConfigErrorRef.current = err instanceof Error ? err : new Error(String(err));
      console.warn(
        "[useGoogleAuth] GoogleSignin.configure failed:",
        googleConfigErrorRef.current.message
      );
    }
  }, []);

  const promptAsync = async () => {
    if (googleConfigErrorRef.current) {
      return { type: "error" as const, error: googleConfigErrorRef.current };
    }

    // hasPlayServices() is Android-only — it throws ServiceNotFoundException on iOS.
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices();
    }
    let userInfo: Awaited<ReturnType<typeof GoogleSignin.signIn>>;
    try {
      userInfo = await GoogleSignin.signIn();
    } catch (err) {
      const signInError = err instanceof Error ? err : new Error(String(err));
      return { type: "error" as const, error: signInError };
    }

    if (userInfo.type === "cancelled") {
      return { type: "cancelled" as const };
    }

    let accessToken: string | null = null;
    let idToken: string | null = null;
    let tokenError: unknown = null;
    try {
      if (SIMULATE_TOKEN_FAILURE) {
        throw new Error("[DEV] Simulated getTokens failure");
      }
      const tokens = await GoogleSignin.getTokens();
      accessToken =
        typeof tokens.accessToken === "string" &&
        tokens.accessToken.trim().length > 0
          ? tokens.accessToken
          : null;
      idToken = tokens.idToken ?? null;
    } catch (err) {
      // Native SDK failed to provide tokens even though sign-in succeeded.
      tokenError = err;
      // Log exact error for production debugging (no PII).
      console.warn(
        "[useGoogleAuth] getTokens() failed after successful signIn:",
        err instanceof Error ? err.message : String(err)
      );
    }

    // Fallback: try to pull idToken from the cached current-user if getTokens didn't provide one
    if (!idToken) {
      idToken = (await GoogleSignin.getCurrentUser())?.idToken ?? null;
    }

    return {
      user: userInfo.data?.user,
      accessToken,
      idToken,
      // Surface exact error when tokens are missing so caller can show it (e.g. production).
      ...(accessToken == null && tokenError != null ? { error: tokenError } : {}),
    };
  };

  return { promptAsync };
}