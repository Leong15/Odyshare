/**
 * useAuth
 * Encapsulates login / register / logout / session-timeout logic
 * previously scattered through App.tsx.
 */

import React, { useState, useEffect, useCallback } from "react";
import type { Participant } from "../types";
import { SESSION_TTL_MS, STORAGE_KEYS } from "../lib/constants";
import { apiClient } from "../lib/apiClient";



function readStorage(key: string): string {
  return localStorage.getItem(key) || "";
}

export interface AuthState {
  loggedInUserId: string | null;
  currentUser: Participant | null;
  authMode: "login" | "register";
  authUsername: string;
  authPassword: string;
  authName: string;
  authEmail: string;
  authError: string | null;
}

export interface AuthActions {
  setAuthMode: (m: "login" | "register") => void;
  setAuthUsername: (v: string) => void;
  setAuthPassword: (v: string) => void;
  setAuthName: (v: string) => void;
  setAuthEmail: (v: string) => void;
  setAuthError: (v: string | null) => void;
  setCurrentUser: (u: Participant | null) => void;
  handleAuthSubmit: (e: React.FormEvent) => Promise<void>;
  handleLogout: () => void;
}

export function useAuth(lang: "en" | "zh"): AuthState & AuthActions {
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(
    () => readStorage(STORAGE_KEYS.LOGGED_IN_USER_ID) || null
  );
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    [
      STORAGE_KEYS.LOGGED_IN_USER_ID,
      STORAGE_KEYS.LOGGED_IN_USER_NAME,
      STORAGE_KEYS.LOGGED_IN_USER_COLOR,
      STORAGE_KEYS.LOGGED_IN_USER_USERNAME,
      STORAGE_KEYS.LOGIN_TIMESTAMP,
      STORAGE_KEYS.SESSION_TOKEN
    ].forEach((k) =>
      localStorage.removeItem(k)
    );
    setLoggedInUserId(null);
    setCurrentUser(null);
  }, []);

  // 12-hour session timeout check with a stable interval callback
  useEffect(() => {
    if (!loggedInUserId) return;

    const check = () => {
      const loginTime = localStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
      if (loginTime && Date.now() - Number(loginTime) > SESSION_TTL_MS) {
        setAuthError(
          lang === "zh"
            ? "您的工作階段已過期 (12 小時)，請重新登入。"
            : "Your session has expired (12 hours timeout), please log in again."
        );
        handleLogout();
      } else if (!loginTime) {
        localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, String(Date.now()));
      }
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [loggedInUserId, lang, handleLogout]);



  const handleAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);

      if (!authUsername.trim() || !authPassword.trim()) {
        setAuthError(lang === "zh" ? "請填寫所有欄位" : "Please fill in all fields");
        return;
      }
      if (authMode === "register") {
        if (!authName.trim() || !authEmail.trim()) {
          setAuthError(
            lang === "zh" ? "請填寫旅伴顯示名稱與電子信箱" : "Please fill in display name and email"
          );
          return;
        }
      }

      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = {
        username: authUsername.trim().toLowerCase(),
        password: authPassword.trim(),
      };
      if (authMode === "register") {
        body.name = authName.trim();
        body.email = authEmail.trim();
      }

      try {
        const data = await apiClient.post(endpoint, body);

        if (!data.success) {
          const errMsg = (data as any).error?.message || "Authentication failed";
          setAuthError(errMsg);
          return;
        }

        const payload = data.data;
        if (payload.pendingVerification) {
          setAuthError(`✅ ${payload.message}`);
          setAuthMode("login");
          setAuthPassword("");
          setAuthName("");
          setAuthEmail("");
          return;
        }

        const user = payload.user;
        const token = payload.token;
        if (!user) {
          throw new Error("User data missing from response");
        }
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER_ID, user.id);
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER_NAME, user.name);
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER_COLOR, user.avatarColor || "#3b82f6");
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER_USERNAME, user.username || "");
        localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, String(Date.now()));
        if (token) {
          localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, token);
        }

        setLoggedInUserId(user.id);
        setCurrentUser(user);
        setAuthUsername("");
        setAuthPassword("");
        setAuthName("");
        setAuthEmail("");
        setAuthError(null);
      } catch {
        setAuthError(
          lang === "zh"
            ? "連線伺服器失敗，請稍後再試"
            : "Connection failed, please try again"
        );
      }
    },
    [authMode, authUsername, authPassword, authName, authEmail, lang, handleLogout]
  );

  return {
    loggedInUserId,
    currentUser,
    authMode,
    authUsername,
    authPassword,
    authName,
    authEmail,
    authError,
    setAuthMode,
    setAuthUsername,
    setAuthPassword,
    setAuthName,
    setAuthEmail,
    setAuthError,
    setCurrentUser,
    handleAuthSubmit,
    handleLogout,
  };
}