import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./ui/Logo";
import { getServerBaseUrl } from "../lib/serverBaseUrl";

const MotionDiv = motion.div;
const MotionButton = motion.button;

const getAuthBase = () => `${getServerBaseUrl()}/api/v1/auth`;
const getGoogleClientId = () => import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [otpData, setOtpData] = useState({
    email: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [otpDeliveryStatus, setOtpDeliveryStatus] = useState("");
  const [requestedOtp, setRequestedOtp] = useState("");
  const [isGoogleSelected, setIsGoogleSelected] = useState(false);
  const [googlePopupReady, setGooglePopupReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);

  const redirectTo = useMemo(() => location.state?.from || "/dashboard", [location.state]);

  const completeLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    login(data.user.role, data.user.name, data.user.department_id);
    navigate(redirectTo, { replace: true });
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setLoading(true);

    try {
      const response = await fetch(`${getAuthBase()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      completeLogin(data);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Server error, please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    const email = otpData.email.trim();
    const otp = otpData.otp.trim();

    if (!email || !otp) {
      setOtpError("Enter both Gmail and OTP.");
      return;
    }

    setOtpError("");
    setOtpSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${getAuthBase()}/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "OTP verification failed");
      }

      completeLogin(data);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      setOtpError("Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.");
      return undefined;
    }

    let cancelled = false;
    const scriptId = "google-identity-client";
    let pollTimer;

    const initializeGoogle = () => {
      if (cancelled || googleInitializedRef.current || !window.google?.accounts?.id) return false;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setOtpError("");
          setOtpSuccess("");
          setRequestedOtp("");
          setOtpDeliveryStatus("");
          setIsGoogleSelected(false);
          setOtpData((prev) => ({ ...prev, otp: "" }));
          setOtpLoading(true);

          try {
            const credential = response?.credential || "";
            if (!credential) {
              throw new Error("Google credential was not received.");
            }

            const apiResponse = await fetch(`${getAuthBase()}/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential }),
            });

            const data = await apiResponse.json();
            if (!apiResponse.ok || !data.success) {
              throw new Error(data.error || "Failed to send OTP after Google sign-in.");
            }

            const gmail = data.email || "";
            if (gmail) {
              setOtpData((prev) => ({ ...prev, email: gmail }));
            }

            setIsGoogleSelected(true);
            setRequestedOtp(data.otp || "");
            setOtpDeliveryStatus(
              data.sent ? "OTP has been emailed to your Gmail inbox." : "OTP generated locally for demo/testing."
            );
            setOtpSuccess("Google account verified. Enter OTP and click Verify OTP & Sign In.");
          } catch (err) {
            setIsGoogleSelected(false);
            setOtpError(err instanceof Error ? err.message : "Google sign-in OTP flow failed.");
          } finally {
            setOtpLoading(false);
          }
        },
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "rectangular",
        });
      }

      googleInitializedRef.current = true;
      setGooglePopupReady(true);
      return true;
    };

    const startPollingForGoogle = () => {
      pollTimer = window.setInterval(() => {
        const initialized = initializeGoogle();
        if (initialized && pollTimer) {
          window.clearInterval(pollTimer);
          pollTimer = undefined;
        }
      }, 300);
    };

    setGooglePopupReady(false);

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      initializeGoogle();
      startPollingForGoogle();
      return () => {
        cancelled = true;
        if (pollTimer) {
          window.clearInterval(pollTimer);
        }
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeGoogle();
      startPollingForGoogle();
    };
    document.body.appendChild(script);
    startPollingForGoogle();

    return () => {
      cancelled = true;
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center font-sans bg-cover bg-center bg-no-repeat relative p-4"
      style={{
        backgroundImage:
          "url(https://www.constructionworld.in/assets/uploads/879eeed86c09426988ae2b82efab24d0.webp)",
      }}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="md:w-[40%] bg-linear-to-br from-[#23333d] to-[#2d414d] p-10 text-white flex flex-col justify-between">
          <div>
            <Logo sizeClassName="w-20 h-20" wrapperClassName="mb-10 rounded-full" />
            <h2 className="text-3xl font-black uppercase leading-tight mb-4 tracking-tight">
              SECURE <br />
              <span className="text-[#00909a]">ACCESS PORTAL.</span>
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-[220px]">
              Authorized access for internal administrative and operational personnel.
            </p>
          </div>

          <div className="mt-20 border-t border-white/10 pt-4">
            <p className="text-[9px] tracking-[0.3em] text-slate-500 font-bold uppercase">
              Internal System
            </p>
          </div>
        </div>

        <div className="md:w-[60%] p-10 lg:p-14 bg-white">
          <div className="mb-10">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase border-b-4 border-[#00909a] inline-block pb-1">
              Login
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Sign in with your password or use Gmail OTP.
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Official Email ID
              </label>
              <input
                type="email"
                required
                disabled={loading}
                className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-[#00909a] transition-all bg-transparent disabled:opacity-50"
                placeholder="admin@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                disabled={loading}
                className="w-full border-b border-slate-200 py-2 text-sm focus:outline-none focus:border-[#00909a] transition-all bg-transparent disabled:opacity-50"
                placeholder="••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <MotionButton
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-[#00909a] hover:bg-[#007a82] text-white py-4 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#00909a]/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </MotionButton>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded">
                {passwordError}
              </div>
            )}
          </form>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200"></div>
            <span className="text-[10px] font-black tracking-[0.25em] text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>

          <form onSubmit={verifyOtp} className="space-y-4">
            <div ref={googleButtonRef} className="flex justify-center min-h-[44px]"></div>

            {!googlePopupReady && (
              <MotionButton
                type="button"
                disabled
                className="w-full border border-slate-300 bg-white text-slate-400 py-3 text-[12px] font-bold tracking-wide rounded-lg disabled:opacity-70"
              >
                Loading Google...
              </MotionButton>
            )}

            {otpLoading && (
              <div className="w-full border border-slate-300 bg-slate-50 text-slate-500 py-3 text-[12px] font-bold tracking-wide rounded-lg text-center">
                Sending OTP...
              </div>
            )}
            {isGoogleSelected && (
              <>
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    disabled={loading || otpLoading}
                    className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-[#00909a] transition-all bg-transparent disabled:opacity-50 tracking-[0.4em]"
                    placeholder="123456"
                    value={otpData.otp}
                    onChange={(e) => setOtpData({ ...otpData, otp: e.target.value })}
                  />
                </div>

                <MotionButton
                  type="submit"
                  disabled={loading || otpLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-[#00909a] hover:bg-[#007a82] text-white py-4 text-[11px] font-black uppercase tracking-widest transition-all rounded-lg disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify OTP & Sign In"}
                </MotionButton>
              </>
            )}
            {otpSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded">
                {otpSuccess}
              </div>
            )}

            {requestedOtp && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Demo OTP: <span className="font-black tracking-widest">{requestedOtp}</span>
              </div>
            )}

            {otpDeliveryStatus && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                {otpDeliveryStatus}
              </div>
            )}

            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded">
                {otpError}
              </div>
            )}
          </form>

          <p className="text-center mt-8 text-[10px] text-slate-400 uppercase tracking-widest">
            Don't have an account?{" "}
            <span
              onClick={() => !loading && navigate("/register")}
              className="text-[#00909a] font-black cursor-pointer hover:underline"
            >
              Register
            </span>
          </p>
        </div>
      </MotionDiv>
    </div>
  );
};

export default LoginPage;
