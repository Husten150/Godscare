import React from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { UserProfile, UserRole } from "../types";
import { 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle,
  Key,
  Shield,
  Stethoscope
} from "lucide-react";

interface AuthProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showVerification, setShowVerification] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all email and password fields.");
      return;
    }

    if (!isLogin && !name) {
      setErrorMsg("Please enter your full name for registration.");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        // --- Login Logic ---
        let uid = "";
        let isFirebaseUser = false;
        let firebaseUser = null;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          uid = userCredential.user.uid;
          isFirebaseUser = true;
          firebaseUser = userCredential.user;
        } catch (err: any) {
          if (err.code === "auth/operation-not-allowed") {
            console.warn("Firebase Auth disabled. Falling back to local UID.");
            uid = "local-" + email.replace(/[^a-zA-Z0-9]/g, "-");
          } else {
            throw err;
          }
        }

        // Enforce email verification for actual Firebase Auth users
        if (isFirebaseUser && firebaseUser && !firebaseUser.emailVerified) {
          setErrorMsg("Your email address is not verified yet. Please check your inbox and verify your email to log in.");
          try {
            await signOut(auth);
          } catch (signOutErr) {
            console.error("Error signing out unverified user:", signOutErr);
          }
          return;
        }

        // Fetch user profile from Firestore
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          localStorage.setItem("greencare_session", JSON.stringify(profile));
          setSuccessMsg("Logged in successfully! Redirecting...");
          setTimeout(() => {
            onAuthSuccess(profile);
          }, 800);
        } else {
          // Fallback if auth is registered but doc is missing
          const fallbackProfile: UserProfile = {
            uid,
            email: email,
            name: name || email.split("@")[0] || "Patient",
            role: "patient",
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, fallbackProfile);
          localStorage.setItem("greencare_session", JSON.stringify(fallbackProfile));
          setSuccessMsg("Logged in! Provisioned fallback profile...");
          setTimeout(() => {
            onAuthSuccess(fallbackProfile);
          }, 800);
        }

      } else {
        // --- Sign Up Logic ---
        let uid = "";
        let isFirebaseUser = false;
        let userCredential = null;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          uid = userCredential.user.uid;
          isFirebaseUser = true;
        } catch (err: any) {
          if (err.code === "auth/operation-not-allowed") {
            console.warn("Firebase Auth disabled. Falling back to local UID.");
            uid = "local-" + email.replace(/[^a-zA-Z0-9]/g, "-");
          } else {
            throw err;
          }
        }

        // Create user document in Firestore as 'patient'
        const profile: UserProfile = {
          uid,
          email,
          name,
          role: "patient", // default signups are always patients
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "users", uid), profile);

        if (isFirebaseUser && userCredential && userCredential.user) {
          try {
            await sendEmailVerification(userCredential.user);
          } catch (verifyErr) {
            console.error("Failed to send verification email:", verifyErr);
          }
          // Do not log them in directly. Let them know they need to verify!
          setVerificationEmail(email);
          setShowVerification(true);
        } else {
          // Local fallback: log in directly since email verification isn't possible
          localStorage.setItem("greencare_session", JSON.stringify(profile));
          setSuccessMsg("Account successfully registered! Redirecting to your panel...");
          setTimeout(() => {
            onAuthSuccess(profile);
          }, 800);
        }
      }

    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email is already registered. Please sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        setErrorMsg("Invalid credentials. Please verify your email and password.");
      } else {
        setErrorMsg(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      const userEmail = userCredential.user.email || "";
      const displayName = userCredential.user.displayName || userEmail.split("@")[0] || "Patient";

      // Verify or write the user profile doc to firestore
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      let profile: UserProfile;

      if (userDocSnap.exists()) {
        profile = userDocSnap.data() as UserProfile;
      } else {
        // Create new patient profile
        profile = {
          uid,
          email: userEmail,
          name: displayName,
          role: "patient",
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profile);
      }

      // Save to localStorage as session fallback
      localStorage.setItem("greencare_session", JSON.stringify(profile));

      setSuccessMsg(`Welcome, ${profile.name}! Logging in with Google...`);
      setTimeout(() => {
        onAuthSuccess(profile);
      }, 800);

    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/operation-not-allowed") {
        setErrorMsg("Google sign-in is not enabled in Firebase Authentication console yet. Please enable the Google provider in your Firebase console.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setErrorMsg("Sign-in popup was closed before completing. Please try again.");
      } else if (err.code === "auth/cancelled-popup-request" || err.message?.includes("iframe") || err.code === "auth/popup-blocked") {
        setErrorMsg("The authentication popup was blocked or cancelled. If you are viewing this inside a preview frame, please click 'Open in a new tab' at the top right of AI Studio and sign in there!");
      } else {
        setErrorMsg(err.message || "An error occurred during Google Sign-In.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="py-16 bg-[#fbfbfc] font-sans min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-zinc-800">
        
        {/* Container Card */}
        <div className="bg-white rounded-xl border border-zinc-200/80 max-w-md w-full p-6 md:p-8 space-y-6 text-center shadow-xs">
          
          {/* Logo/Icon block */}
          <div className="space-y-2">
            <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 animate-pulse">
              <Mail className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight font-display">
              Verify your email
            </h2>
            <p className="text-sm text-zinc-500 font-sans">
              We've sent a verification link to <span className="font-semibold text-zinc-900">{verificationEmail}</span>.
            </p>
          </div>

          {/* Guidelines box */}
          <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100/60 text-left text-xs text-zinc-700 space-y-2.5 font-sans leading-relaxed">
            <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              What should you do next?
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-zinc-600 pl-1">
              <li>Check your inbox and spam folder for the verification email.</li>
              <li>Click the confirmation link inside the email to activate your profile.</li>
              <li>Once verified, click the button below to sign in.</li>
            </ul>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => {
              setShowVerification(false);
              setIsLogin(true);
              setErrorMsg("");
              setSuccessMsg("Email verification link sent! Please log in after verifying your account.");
            }}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
            id="auth-go-to-signin-btn"
          >
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-[#fbfbfc] font-sans min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-zinc-800">
      
      {/* Container Card */}
      <div className="bg-white rounded-xl border border-zinc-200/80 max-w-md w-full p-6 md:p-8 space-y-6">
        
        {/* Logo block */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-11 w-11 bg-zinc-900 rounded-lg text-white flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight font-display">
            {isLogin ? "Welcome Back" : "Register Profile"}
          </h2>
          <p className="text-xs text-zinc-500 font-sans">
            {isLogin 
              ? "Access your dashboard, medical records, and consultations" 
              : "Register as a patient to book appointments and upload medical reports"
            }
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="flex items-center space-x-2 bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-sans">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 font-sans">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name (Sign Up only) */}
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-zinc-400 block uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Johnathan Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 focus:bg-white transition-all"
                  required={!isLogin}
                  id="auth-name-input"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-zinc-400 block uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="email"
                placeholder="patient@greencare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 focus:bg-white transition-all"
                required
                id="auth-email-input"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-zinc-400 block uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50/50 hover:bg-slate-50 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 focus:bg-white transition-all"
                required
                id="auth-password-input"
              />
            </div>
          </div>

          {/* Button Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:bg-zinc-400 disabled:cursor-not-allowed"
            id="auth-submit-btn"
          >
            {isLogin ? (
              <>
                <LogIn className="h-3.5 w-3.5 text-emerald-400" />
                <span>{loading ? "Verifying..." : "Sign In to Portal"}</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>{loading ? "Registering..." : "Create Account"}</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink mx-4 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full py-2.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-sans font-semibold transition-all flex items-center justify-center space-x-2.5 cursor-pointer disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed shadow-xs"
          id="auth-google-btn"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <span>{isLogin ? "Sign in with Google" : "Sign up with Google"}</span>
        </button>

        {/* Toggle Form type link */}
        <div className="text-center text-xs text-zinc-500 border-t border-zinc-100 pt-4 font-sans">
          <span>{isLogin ? "Don't have a secure patient account?" : "Already registered with us?"}</span>{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-zinc-900 font-bold hover:underline cursor-pointer"
            id="auth-toggle-btn"
          >
            {isLogin ? "Create Account" : "Login Here"}
          </button>
        </div>

      </div>
    </div>
  );
}
