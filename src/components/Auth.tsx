import React from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
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
  Stethoscope,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface AuthProps {
  onAuthSuccess: (profile: UserProfile) => void;
  themeMode?: "light" | "dark";
}

export default function Auth({ onAuthSuccess, themeMode = "light" }: AuthProps) {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showVerification, setShowVerification] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState("");
  const [resending, setResending] = React.useState(false);

  const isDark = themeMode === "dark";


  // Monitor auth changes on mount to check if an active unverified session exists
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.emailVerified) {
        setVerificationEmail(user.email || "");
        setShowVerification(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Background polling to detect when the user verifies their email
  React.useEffect(() => {
    let intervalId: any;
    
    if (showVerification) {
      intervalId = setInterval(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            await currentUser.reload();
            if (currentUser.emailVerified) {
              clearInterval(intervalId);
              setSuccessMsg("Email successfully verified! Transitioning to your patient portal...");
              
              const uid = currentUser.uid;
              const userDocRef = doc(db, "users", uid);
              const userDocSnap = await getDoc(userDocRef);
              
              let profile: UserProfile;
              if (userDocSnap.exists()) {
                profile = userDocSnap.data() as UserProfile;
              } else {
                profile = {
                  uid,
                  email: currentUser.email || "",
                  name: name || currentUser.displayName || currentUser.email?.split("@")[0] || "Patient",
                  role: "patient",
                  createdAt: new Date().toISOString()
                };
                await setDoc(userDocRef, profile);
              }
              
              localStorage.setItem("greencare_session", JSON.stringify(profile));
              setTimeout(() => {
                onAuthSuccess(profile);
              }, 1200);
            }
          } catch (err) {
            console.error("Error during verification polling:", err);
          }
        }
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showVerification, name, onAuthSuccess]);

  // Determine inbox URL based on email address domain
  const getInboxUrl = (emailStr: string) => {
    const domain = emailStr.split("@")[1]?.toLowerCase() || "";
    if (domain === "gmail.com") return { url: "https://mail.google.com", name: "Gmail" };
    if (domain === "yahoo.com" || domain === "ymail.com") return { url: "https://mail.yahoo.com", name: "Yahoo Mail" };
    if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return { url: "https://outlook.live.com", name: "Outlook Mail" };
    if (domain === "aol.com") return { url: "https://mail.aol.com", name: "AOL Mail" };
    if (domain === "icloud.com" || domain === "me.com") return { url: "https://www.icloud.com/mail", name: "iCloud Mail" };
    return { url: `https://www.${domain}`, name: domain || "Webmail" };
  };

  // Resend Verification link
  const handleResendVerification = async () => {
    if (resending) return;
    setResending(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const actionCodeSettings = {
          url: window.location.origin,
          handleCodeInApp: false,
        };
        await sendEmailVerification(currentUser, actionCodeSettings);
        setSuccessMsg("A fresh email verification link has been sent to your inbox!");
      } else {
        setErrorMsg("Session expired. Please sign in again to receive a link.");
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      setErrorMsg(err.message || "Failed to resend verification link.");
    } finally {
      setResending(false);
    }
  };

  // Exit/Cancel verification view and clear the unverified auth state
  const handleCancelVerification = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setShowVerification(false);
      setIsLogin(true);
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

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

        // Direct unverified users to the secure verification view to let them verify
        if (isFirebaseUser && firebaseUser && !firebaseUser.emailVerified) {
          setVerificationEmail(email);
          setShowVerification(true);
          setSuccessMsg("Verification required. Please check your inbox to verify your account!");
          setLoading(false);
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
            // Configure action settings to return the user back to the application once verified
            const actionCodeSettings = {
              url: window.location.origin,
              handleCodeInApp: false,
            };
            await sendEmailVerification(userCredential.user, actionCodeSettings);
          } catch (verifyErr) {
            console.error("Failed to send verification email:", verifyErr);
          }
          // Do not log them in directly. Transition to inbox verification flow
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
    const inboxInfo = getInboxUrl(verificationEmail);

    return (
      <div className={`py-12 px-4 sm:px-6 lg:px-8 font-sans min-h-[85vh] flex flex-col justify-center items-center transition-colors ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-[#fbfbfc] text-zinc-800"
      }`}>
        <div className={`rounded-2xl border max-w-lg w-full p-6 md:p-8 space-y-6 text-center shadow-xl relative overflow-hidden ${
          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200/80 text-zinc-900"
        }`}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"></div>

          {/* Logo/Icon block */}
          <div className="space-y-2 pt-2">
            <div className="mx-auto h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 animate-pulse border border-emerald-500/20">
              <Mail className="h-8 w-8" />
            </div>
            <h2 className={`text-2xl font-bold tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>
              Verify your identity
            </h2>
            <p className={`text-xs font-sans leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              We've sent a secure clinical portal access link to <br />
              <span className={`font-semibold px-2.5 py-1 rounded-md mt-1.5 inline-block border ${
                isDark ? "bg-zinc-800 text-emerald-400 border-zinc-700" : "bg-zinc-50 text-zinc-900 border-zinc-200"
              }`}>{verificationEmail}</span>
            </p>
          </div>

          {/* Real-time status notifications */}
          {successMsg && (
            <div className="bg-emerald-500/10 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/30 font-sans text-left flex items-start gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/10 text-rose-400 text-xs p-3 rounded-lg border border-rose-500/30 font-sans text-left flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Link Button */}
          <div className="space-y-3">
            <a
              href={inboxInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
              id="auth-go-to-inbox-btn"
            >
              <span>Go to {inboxInfo.name} Inbox</span>
              <ExternalLink className="h-4 w-4 text-zinc-950" />
            </a>

            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest pt-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              <span>Listening for verification link click...</span>
            </div>
          </div>

          {/* Guidelines box */}
          <div className={`rounded-xl p-4 border text-left text-xs space-y-2.5 font-sans leading-relaxed ${
            isDark ? "bg-zinc-800/60 border-zinc-700/80 text-zinc-300" : "bg-emerald-50/40 border-emerald-100/60 text-zinc-700"
          }`}>
            <p className="font-semibold text-emerald-500 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
              Secure Hospital Portal Guidelines:
            </p>
            <ul className={`space-y-1.5 list-disc list-inside pl-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              <li>Click the confirmation link inside the email to verify it's you.</li>
              <li>Once clicked, you will be redirected back here, or this tab will instantly update.</li>
              <li>Check your spam/junk folder if the email doesn't arrive in 2 minutes.</li>
            </ul>
          </div>

          {/* Secondary Actions */}
          <div className={`grid grid-cols-1 gap-2 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 ${
                isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
              <span>{resending ? "Sending new link..." : "Resend Verification Email"}</span>
            </button>

            <button
              type="button"
              onClick={handleCancelVerification}
              className={`w-full py-2 border rounded-lg text-xs font-semibold cursor-pointer ${
                isDark ? "border-zinc-800 hover:bg-zinc-800 text-zinc-400" : "border-zinc-200 hover:bg-zinc-50 text-zinc-500"
              }`}
            >
              Cancel & Use Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans min-h-[85vh] flex flex-col justify-center items-center transition-colors ${
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-[#fbfbfc] text-zinc-800"
    }`}>
      
      {/* Main Split Layout Container */}
      <div className={`max-w-6xl w-full rounded-2xl border shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] transition-all ${
        isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200/80"
      }`}>
        
        {/* Left Side: Prominent Doctor Image & Medical Showcase */}
        <div className="lg:col-span-6 xl:col-span-7 relative flex flex-col justify-between overflow-hidden min-h-[360px] lg:min-h-full">
          {/* Background High-Res Doctor Photo */}
          <img 
            src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1200&auto=format&fit=crop" 
            alt="GodsCare Hospital Lead Doctor" 
            className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
          />
          
          {/* Dark Gradient Overlay for optimal text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/30 p-6 sm:p-10 flex flex-col justify-between text-white relative z-10">
            
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-zinc-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-mono tracking-wide">
                <Stethoscope className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-white uppercase tracking-wider">GodsCare Patient Portal</span>
              </div>

              <div className="flex items-center space-x-1.5 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                <span className="h-2 w-2 bg-emerald-400 rounded-full animate-ping"></span>
                <span>24/7 Desk Active</span>
              </div>
            </div>

            {/* Middle Content */}
            <div className="space-y-4 my-8 lg:my-auto">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display leading-tight tracking-tight text-white drop-shadow-md">
                World-Class Clinical Care, <br />
                <span className="text-emerald-400">Dedicated Physicians.</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-200 max-w-lg leading-relaxed font-sans drop-shadow-xs">
                Access your confidential medical records, book board-certified specialist appointments, track lab diagnostic results, and consult with doctors from any device.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2 bg-zinc-900/80 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-100">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>256-Bit Encrypted Vault</span>
                </div>
                <div className="flex items-center space-x-2 bg-zinc-900/80 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-100">
                  <Key className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Instant E-Prescriptions</span>
                </div>
              </div>
            </div>

            {/* Bottom Doctor Spotlight Badge */}
            <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-white/15 flex items-center space-x-3 shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&auto=format&fit=crop" 
                alt="Dr. Sarah Jenkins" 
                className="h-11 w-11 rounded-full object-cover border-2 border-emerald-400 shrink-0"
              />
              <div className="grow min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate font-display">Dr. Sarah Jenkins, MD</h4>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    ★ 99.4% Rating
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 truncate font-sans">Chief of Medical Consultations & Cardiology</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Moved Sign-In Options */}
        <div className={`lg:col-span-6 xl:col-span-5 p-6 sm:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l transition-colors ${
          isDark 
            ? "bg-zinc-900/95 border-zinc-800 text-zinc-100" 
            : "bg-white border-zinc-200/80 text-zinc-900"
        }`}>
          
          {/* Header */}
          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-500">
              <User className="h-3.5 w-3.5" />
              <span>{isLogin ? "Portal Sign-In" : "Patient Registration"}</span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className={`text-xs font-sans leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {isLogin 
                ? "Enter your credentials to manage your health portal, records, and visits." 
                : "Register as a patient to book specialist consultations and view medical history."
              }
            </p>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="flex items-center space-x-2 bg-rose-500/10 text-rose-400 text-xs p-3 rounded-xl border border-rose-500/30 font-sans mb-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-xs p-3 rounded-xl border border-emerald-500/30 font-sans mb-4">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Sign Up only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Johnathan Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-sans transition-all focus:outline-hidden border ${
                      isDark 
                        ? "bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-800" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white"
                    }`}
                    required={!isLogin}
                    id="auth-name-input"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  placeholder="patient@godscare.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-sans transition-all focus:outline-hidden border ${
                    isDark 
                      ? "bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-800" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white"
                  }`}
                  required
                  id="auth-email-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-sans transition-all focus:outline-hidden border ${
                    isDark 
                      ? "bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-800" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white"
                  }`}
                  required
                  id="auth-password-input"
                />
              </div>
            </div>

            {/* Button Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark 
                  ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950" 
                  : "bg-zinc-900 hover:bg-zinc-800 text-white"
              }`}
              id="auth-submit-btn"
            >
              {isLogin ? (
                <>
                  <LogIn className="h-4 w-4 text-emerald-400" />
                  <span>{loading ? "Verifying..." : "Sign In to Portal"}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                  <span>{loading ? "Registering..." : "Create Account"}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-3 items-center">
            <div className={`flex-grow border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}></div>
            <span className={`flex-shrink mx-4 text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>or</span>
            <div className={`flex-grow border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}></div>
          </div>

          {/* Google Authentication Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className={`w-full py-2.5 rounded-xl text-xs font-sans font-semibold transition-all flex items-center justify-center space-x-2.5 cursor-pointer border shadow-2xs disabled:opacity-50 cursor-pointer ${
              isDark 
                ? "bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border-zinc-700" 
                : "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200"
            }`}
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
          <div className={`text-center text-xs border-t pt-4 font-sans mt-4 ${
            isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-100 text-zinc-500"
          }`}>
            <span>{isLogin ? "Don't have a secure patient account?" : "Already registered with us?"}</span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`font-bold hover:underline cursor-pointer ${isDark ? "text-emerald-400" : "text-zinc-900"}`}
              id="auth-toggle-btn"
            >
              {isLogin ? "Create Account" : "Login Here"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );

}
