import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useState } from "react";
import { call as invoke } from "../api";
import { openUrl } from "@tauri-apps/plugin-opener";
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

  async function openForgotPassword() {
    try {
      await openUrl("https://auth.hawkaerosystem.com/realms/master/login-actions/reset-credentials?client_id=bibo-tracker&redirect_uri=https://erp.hawkaerosystem.com");
    } catch (err) {
      console.error("Failed to open reset password URL:", err);
    }
  }

  async function openSignup() {
    try {
      const url = await invoke<string>("signup_url");
      await openUrl(url);
    } catch {
      /* ignore */
    }
  }

  function launchErpSession(userEmail: string, userPass: string) {
    const autoLoginScript = `
      window.addEventListener('DOMContentLoaded', () => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const emailInput = document.querySelector("#login_email, input[type='email'], input[name='usr']");
          const passInput = document.querySelector("#login_password, input[type='password'], input[name='pwd']");
          const submitBtn = document.querySelector(".btn-login, button[type='submit']");

          if (emailInput && passInput && submitBtn) {
            clearInterval(interval);
            emailInput.value = ${JSON.stringify(userEmail)};
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));

            passInput.value = ${JSON.stringify(userPass)};
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            submitBtn.click();
          } else if (attempts > 30) {
            clearInterval(interval);
          }
        }, 100);
      });
    `;

    const erpWin = new WebviewWindow("erpnext-dashboard", {
      url: "https://erp.hawkaerosystem.com/login",
      title: "ERPNext Dashboard - Hawk Aerosystems",
      width: 1400,
      height: 900,
      center: true,
      resizable: true,
      focus: true,
      initializationScript: autoLoginScript,
    });

    erpWin.once("tauri://created", () => {
      getCurrentWindow().hide();
    });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    try {
      const cleanEmail = email.trim();

      const session = await invoke<Session>("login", {
        email: cleanEmail,
        password,
        businessId: null,
      });
      onLoggedIn(session);

      launchErpSession(cleanEmail, password);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login welcome">
      <AuthTitleBar />
      {onBack && (
        <button type="button" className="welcome-back" onClick={onBack}>
          <BackIcon />
          {t("login.back")}
        </button>
      )}
      <div className="welcome-lang">
        <LanguageSwitcher compact />
      </div>

      <BrandMark />
      <form className="login-card" onSubmit={signIn}>
        <h1 className="login-title">{t("login.title")}</h1>
        <p className="login-sub">{t("login.subtitle")}</p>

        <div className="auth-form">
          {error && (
            <div className="auth-err" role="alert">
              <AlertIcon />
              {error}
            </div>
          )}

          <label className="auth-field">
            <span className="auth-field-lbl">{t("login.identifier")}</span>
            <div className="auth-input">
              <span className="auth-input-ic">
                <AtSignIcon />
              </span>
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
          </label>

          <label className="auth-field">
            <span className="auth-field-lbl">{t("login.password")}</span>
            <div className="auth-input">
              <span className="auth-input-ic">
                <LockIcon />
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </label>

          <div className="auth-forgot-row">
            <button
              type="button"
              className="auth-signup"
              style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
              onClick={openForgotPassword}
            >
              Forgot password?
            </button>
            <button type="button" className="auth-signup" onClick={openSignup}>
              {t("login.signupLink")}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            className="auth-btn"
            type="submit"
            disabled={busy}
          >
            {busy ? t("login.submitting") : t("login.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
