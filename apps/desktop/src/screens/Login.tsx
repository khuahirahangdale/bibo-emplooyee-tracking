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

  function launchErpDirectLogin(usr: string, pwd: string) {
    try {
      // Create self-submitting HTML payload to establish the ERPNext session cookie natively in WebView
      const autoSubmitHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Authenticating...</title></head>
          <body style="background:#f4f5f7;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555;">
            <p>Connecting to ERPNext Dashboard...</p>
            <form id="f" method="POST" action="https://erp.hawkaerosystem.com/api/method/login">
              <input type="hidden" name="usr" value="${encodeURIComponent(usr)}" />
              <input type="hidden" name="pwd" value="${encodeURIComponent(pwd)}" />
            </form>
            <script>
              document.forms[0].usr.value = decodeURIComponent(document.forms[0].usr.value);
              document.forms[0].pwd.value = decodeURIComponent(document.forms[0].pwd.value);
              fetch("https://erp.hawkaerosystem.com/api/method/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "usr=" + encodeURIComponent(document.forms[0].usr.value) + "&pwd=" + encodeURIComponent(document.forms[0].pwd.value)
              }).then(function(res) {
                window.location.replace("https://erp.hawkaerosystem.com/app");
              }).catch(function() {
                window.location.replace("https://erp.hawkaerosystem.com/login");
              });
            </script>
          </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(autoSubmitHtml)}`;

      new WebviewWindow("erpnext-dashboard", {
        url: dataUrl,
        title: "ERPNext Dashboard - Hawk Aerosystems",
        width: 1400,
        height: 900,
        center: true,
        resizable: true,
        focus: true,
      });

      getCurrentWindow().hide();
    } catch (e) {
      console.error("Failed to launch ERPNext window:", e);
    }
  }

  function openForgotPassword() {
    try {
      new WebviewWindow("erpnext-forgot-password", {
        url: "https://erp.hawkaerosystem.com/login#forgot",
        title: "Reset Password - Hawk Aerosystems",
        width: 600,
        height: 700,
        center: true,
        resizable: true,
        focus: true,
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
      const cleanEmail = email.trim();

      // 1. Authenticate BiBo tracking daemon
      const session = await invoke<Session>("login", {
        email: cleanEmail,
        password,
        businessId: null,
      });
      onLoggedIn(session);

      // 2. Authenticate the WebView window directly into ERPNext
      launchErpDirectLogin(cleanEmail, password);
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
                placeholder="Password"
              />
            </div>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px", marginBottom: "16px" }}>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#6366f1",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "underline"
              }}
              onClick={openForgotPassword}
            >
              Forgot password?
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
