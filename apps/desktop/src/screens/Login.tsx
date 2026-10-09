import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useState } from "react";
import { call as invoke } from "../api";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { BrandMark } from "../ui";
import { AuthTitleBar } from "../components/AuthTitleBar";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export type Session = {
  email: string;
  business_id?: string | null;
  display_name?: string;
  username?: string;
  account_type?: string;
};

const AtSignIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export function Login({
  onLoggedIn,
  onBack,
}: {
  onLoggedIn: (s: Session) => void;
  onBack?: () => void;
}) {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Keycloak password reset window
  function openForgotPassword() {
    try {
      const resetWin = new WebviewWindow("keycloak-reset-password", {
        url: "https://auth.hawkaerosystem.com/realms/master/login-actions/reset-credentials?client_id=bibo-tracker",
        title: "Reset Password - Hawk Aerosystems",
        width: 600,
        height: 700,
        center: true,
        resizable: true,
        focus: true,
      });

      // Refocus the main login window once the user finishes and closes the reset window
      resetWin.once("tauri://destroyed", () => {
        getCurrentWindow().setFocus();
      });
    } catch (err) {
      console.error("Failed to open reset password window:", err);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const session = await invoke<Session>("login", {
        email: email.trim(),
        password,
        businessId: null,
      });

      onLoggedIn(session);

      try {
        new WebviewWindow("erpnext-dashboard", {
          url: "