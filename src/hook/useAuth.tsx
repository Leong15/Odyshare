/**
 * useAuth
 * Encapsulates login / register / logout / session-timeout logic
 * previously scattered through App.tsx.
 */

import React, { useState, useEffect, useCallback } from "react";
import type { Participant } from "../types";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

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
    () => readStorage("loggedInUserId") || null
  );
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // 12-hour session timeout
  useEffect(() => {
    if (!loggedInUserId) return;

    const check = () => {
      const loginTime = localStorage.getItem("loginTimestamp");
      if (loginTime && Date.now() - Number(loginTime) > SESSION_TTL_MS) {
        setAuthError(
          lang === "zh"
            ? "您的工作階段已過期 (12 小時)，請重新登入。"
            : "Your session has expired (12 hours timeout), please log in again."
        );
        handleLogout();
      } else if (!loginTime) {
        localStorage.setItem("loginTimestamp", String(Date.now()));
      }
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUserId, lang]);

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
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) {
          setAuthError(data.error || "Authentication failed");
          return;
        }

        if (data.pendingVerification) {
          setAuthError(`✅ ${data.message}`);
          setAuthMode("login");
          setAuthPassword("");
          setAuthName("");
          setAuthEmail("");
          return;
        }

        const user = data.user;
        localStorage.setItem("loggedInUserId", user.id);
        localStorage.setItem("loggedInUserName", user.name);
        localStorage.setItem("loggedInUserColor", user.avatarColor || "#3b82f6");
        localStorage.setItem("loggedInUserUsername", user.username || "");
        localStorage.setItem("loginTimestamp", String(Date.now()));

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
    [authMode, authUsername, authPassword, authName, authEmail, lang]
  );

  const handleLogout = useCallback(() => {
    ["loggedInUserId", "loggedInUserName", "loggedInUserColor",
      "loggedInUserUsername", "loginTimestamp"].forEach((k) =>
      localStorage.removeItem(k)
    );
    setLoggedInUserId(null);
    setCurrentUser(null);
  }, []);

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