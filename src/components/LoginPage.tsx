"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { TurnSolarLogo } from "./TurnSolarLogo";

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    const success = login(password);
    if (!success) {
      setError(true);
      setShaking(true);
      setPassword("");
      setTimeout(() => setShaking(false), 500);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg, #0A3D52 0%, #0F5C7A 50%, #0A3D52 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -140,
          right: -140,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(125,191,46,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,150,190,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ marginBottom: 44, textAlign: "center" }}>
          <TurnSolarLogo width={200} />
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              marginTop: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Offer Management System
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "36px 32px",
            width: "100%",
            backdropFilter: "blur(20px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
            animation: shaking ? "shake 0.45s ease" : "none",
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: 5,
              }}
            >
              Welcome back
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.5,
              }}
            >
              Enter your password to access the offer system
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 7,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter your password"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.07)",
                border: `1.5px solid ${error ? "#EF4444" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 10,
                color: "#ffffff",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.borderColor = "#7DBF2E";
                  e.target.style.boxShadow = "0 0 0 3px rgba(125,191,46,0.2)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.borderColor = "rgba(255,255,255,0.12)";
                  e.target.style.boxShadow = "none";
                }
              }}
            />
            {error && (
              <div
                style={{
                  color: "#F87171",
                  fontSize: 12,
                  marginTop: 7,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>✕</span> Incorrect password. Please try again.
              </div>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "13px",
              background:
                !password || loading ? "rgba(125,191,46,0.4)" : "#7DBF2E",
              border: "none",
              borderRadius: 10,
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: !password || loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              boxShadow:
                !password || loading
                  ? "none"
                  : "0 4px 20px rgba(125,191,46,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <Spinner /> Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowIcon />
              </>
            )}
          </button>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
            textAlign: "center",
          }}
        >
          Contact your admin@turnsolar.com/gjealfaro@turnsolar.com for access.
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: 14,
      height: 14,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite",
    }}
  />
);
