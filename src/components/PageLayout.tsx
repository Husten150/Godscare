import React from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { UserProfile, normalizeUserRole } from "../types";
import { Shield, Lock } from "lucide-react";
import { AppView, navigateToPage } from "../routes";
import Header from "./Header";
import Footer from "./Footer";
import Auth from "./Auth";
import FloatingAIAssistant from "./FloatingAIAssistant";

export interface PageContextValue {
  userProfile: UserProfile | null;
  themeMode: "light" | "dark";
  toggleTheme: () => void;
  handleAuthSuccess: (profile: UserProfile) => void;
  handleLogout: () => Promise<void>;
}

interface PageLayoutProps {
  currentView: AppView;
  requireAuth?: boolean;
  allowedRoles?: Array<"patient" | "admin" | "admin_administrator">;
  children: (ctx: PageContextValue) => React.ReactNode;
}

function readCachedSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem("greencare_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || !parsed.uid) return null;
    return {
      ...parsed,
      role: normalizeUserRole(parsed.role, parsed.email),
    };
  } catch {
    return null;
  }
}

export default function PageLayout({
  currentView,
  requireAuth = false,
  allowedRoles,
  children,
}: PageLayoutProps) {
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(readCachedSession);
  const [authResolved, setAuthResolved] = React.useState<boolean>(false);
  const [paymentNotification, setPaymentNotification] = React.useState<{
    status: "success" | "error";
    message: string;
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem("godscare_payment_notification");
      if (saved) {
        sessionStorage.removeItem("godscare_payment_notification");
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Theme preference ("system" | "light" | "dark")
  const [themePreference, setThemePreference] = React.useState<"system" | "light" | "dark">(() => {
    const saved = localStorage.getItem("godscare_theme_preference");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    const legacy = localStorage.getItem("godscare_theme");
    if (legacy === "light" || legacy === "dark") return legacy;
    return "system";
  });

  const [systemPrefersDark, setSystemPrefersDark] = React.useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPrefersDark(e.matches);
    };
    handleChange(mediaQuery);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const themeMode: "light" | "dark" =
    themePreference === "system" ? (systemPrefersDark ? "dark" : "light") : themePreference;

  React.useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      document.body.style.backgroundColor = "#09090b";
      document.body.style.color = "#f4f4f5";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.body.style.backgroundColor = "#f8fafc";
      document.body.style.color = "#0f172a";
    }
  }, [themeMode]);

  const handleSetThemePreference = (pref: "system" | "light" | "dark") => {
    setThemePreference(pref);
    localStorage.setItem("godscare_theme_preference", pref);
    localStorage.removeItem("godscare_theme");
  };

  const toggleTheme = () => {
    handleSetThemePreference(themeMode === "dark" ? "light" : "dark");
  };

  // Handle legacy ?view=... redirects and Paystack ?payment=... callbacks on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const legacyView = params.get("view");
    if (
      legacyView &&
      ["home", "departments", "doctors", "auth", "dashboard", "admin", "admin_administrator"].includes(legacyView) &&
      legacyView !== currentView
    ) {
      const extra: Record<string, string> = {};
      const dept = params.get("department");
      if (dept) extra.department = dept;
      navigateToPage(legacyView, extra, true);
      return;
    }

    const payment = params.get("payment");
    const type = params.get("type");
    const message = params.get("message");

    if (payment === "success" || payment === "error") {
      let note: { status: "success" | "error"; message: string };
      if (payment === "success") {
        let friendlyType = "your transaction";
        if (type === "premium") friendlyType = "your premium care subscription upgrade";
        else if (type === "appointment") friendlyType = "your clinical appointment booking fee";
        else if (type === "bill") friendlyType = "your outstanding medical invoice payment";
        else if (type === "medicine") friendlyType = "your prescribed pharmacy medication order";

        note = {
          status: "success",
          message: `Payment for ${friendlyType} has been successfully verified! Your clinical record is fully updated.`,
        };
      } else {
        note = {
          status: "error",
          message: `Payment verification failed: ${message || "the transaction could not be completed."}`,
        };
      }

      const cached = readCachedSession();
      if (payment === "success" && cached && currentView === "home") {
        try {
          sessionStorage.setItem("godscare_payment_notification", JSON.stringify(note));
        } catch {
          // ignore
        }
        const target =
          cached.role === "admin_administrator"
            ? "admin_administrator"
            : cached.role === "admin"
            ? "admin"
            : "dashboard";
        navigateToPage(target, undefined, true);
        return;
      }

      setPaymentNotification(note);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("payment");
      cleanUrl.searchParams.delete("type");
      cleanUrl.searchParams.delete("message");
      cleanUrl.searchParams.delete("reference");
      window.history.replaceState({}, document.title, cleanUrl.toString());
    }
  }, [currentView]);

  // Monitor Firebase Auth status across pages
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          let profile: UserProfile;
          try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const normRole = normalizeUserRole(data.role, data.email || firebaseUser.email);
              profile = {
                uid: firebaseUser.uid,
                email: data.email || firebaseUser.email || "",
                name: data.name || (normRole === "admin_administrator" ? "Hospital Director" : "User"),
                role: normRole,
                createdAt: data.createdAt || new Date().toISOString(),
                isPremium: !!data.isPremium,
                phone: data.phone,
              };
            } else {
              const normRole = normalizeUserRole("patient", firebaseUser.email);
              profile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: firebaseUser.displayName || (normRole === "admin_administrator" ? "Hospital Director" : "User"),
                role: normRole,
                createdAt: new Date().toISOString(),
              };
            }
          } catch (fetchErr) {
            console.warn("Firestore profile fetch error, fallback to local/auth:", fetchErr);
            const normRole = normalizeUserRole("patient", firebaseUser.email);
            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || (normRole === "admin_administrator" ? "Hospital Director" : "User"),
              role: normRole,
              createdAt: new Date().toISOString(),
            };
          }

          setUserProfile(profile);
          localStorage.setItem("greencare_session", JSON.stringify(profile));

          if (currentView === "auth") {
            const pendingBooking = sessionStorage.getItem("godscare_booking_doctor");
            const target =
              pendingBooking && profile.role === "patient"
                ? "dashboard"
                : profile.role === "admin_administrator"
                ? "admin_administrator"
                : profile.role === "admin"
                ? "admin"
                : "dashboard";
            navigateToPage(target, undefined, true);
          }
        } else {
          const localProfile = readCachedSession();
          if (localProfile) {
            setUserProfile(localProfile);
            if (currentView === "auth") {
              const pendingBooking = sessionStorage.getItem("godscare_booking_doctor");
              const target =
                pendingBooking && localProfile.role === "patient"
                  ? "dashboard"
                  : localProfile.role === "admin_administrator"
                  ? "admin_administrator"
                  : localProfile.role === "admin"
                  ? "admin"
                  : "dashboard";
              navigateToPage(target, undefined, true);
            }
          } else {
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.error("Auth sync error:", err);
      } finally {
        setAuthResolved(true);
      }
    });

    return () => unsubscribe();
  }, [currentView]);

  const handleAuthSuccess = (profile: UserProfile) => {
    const normRole = normalizeUserRole(profile.role, profile.email);
    const normalizedProfile = { ...profile, role: normRole };
    setUserProfile(normalizedProfile);
    localStorage.setItem("greencare_session", JSON.stringify(normalizedProfile));

    const pendingBooking = sessionStorage.getItem("godscare_booking_doctor");
    if (pendingBooking && normRole === "patient") {
      navigateToPage("dashboard");
    } else {
      const target =
        normRole === "admin_administrator"
          ? "admin_administrator"
          : normRole === "admin"
          ? "admin"
          : "dashboard";
      navigateToPage(target);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      localStorage.removeItem("greencare_session");
      sessionStorage.removeItem("godscare_booking_doctor");
      setUserProfile(null);
      navigateToPage("home");
    }
  };

  const handleSetView = (view: string) => {
    navigateToPage(view);
  };

  const normalizedRole = userProfile
    ? normalizeUserRole(userProfile.role, userProfile.email)
    : null;

  const isWaitingForProtectedAuth = requireAuth && !userProfile && !authResolved;

  const renderMainContent = () => {
    if (isWaitingForProtectedAuth) {
      return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-sans text-sm font-semibold tracking-tight">
            Syncing encrypted medical records...
          </p>
        </div>
      );
    }

    if (requireAuth && !userProfile) {
      return <Auth onAuthSuccess={handleAuthSuccess} themeMode={themeMode} />;
    }

    if (
      requireAuth &&
      userProfile &&
      allowedRoles &&
      normalizedRole &&
      !allowedRoles.includes(normalizedRole)
    ) {
      if (currentView === "admin_administrator" && normalizedRole === "admin") {
        return (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <div
              className={`p-8 rounded-2xl border ${
                themeMode === "dark"
                  ? "bg-zinc-900/80 border-zinc-800 text-zinc-100"
                  : "bg-white border-zinc-200 text-zinc-900"
              } shadow-xl`}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold font-display mb-2">Hospital Director Access Required</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                You are signed in as Staff Admin ({userProfile.email}). Modifying hospital prices, altering doctor profiles, and full site reconfiguration is reserved for the Admin Administrator (Director).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => navigateToPage("admin")}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer"
                >
                  Open Staff Admin Panel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Sign Out to Login as Director
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div
            className={`p-8 rounded-2xl border ${
              themeMode === "dark"
                ? "bg-zinc-900/80 border-zinc-800 text-zinc-100"
                : "bg-white border-zinc-200 text-zinc-900"
            } shadow-xl`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold font-display mb-2">
              {normalizedRole === "patient" ? "Administrative Console Restricted" : "Patient Dashboard View"}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
              {normalizedRole === "patient"
                ? `You are signed in with a Patient account (${userProfile.email}). This area is restricted to authorized administrative personnel.`
                : `You are signed in as ${normalizedRole === "admin_administrator" ? "Hospital Director" : "Staff Admin"} (${userProfile.email}).`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() =>
                  navigateToPage(
                    normalizedRole === "admin_administrator"
                      ? "admin_administrator"
                      : normalizedRole === "admin"
                      ? "admin"
                      : "dashboard"
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer"
              >
                {normalizedRole === "patient" ? "Return to My Patient Dashboard" : "Open My Console"}
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                Sign Out & Switch Account
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children({
      userProfile,
      themeMode,
      toggleTheme,
      handleAuthSuccess,
      handleLogout,
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 selection:bg-emerald-100 selection:text-emerald-900 ${
        themeMode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-zinc-900"
      }`}
    >
      <Header
        currentView={currentView}
        setCurrentView={handleSetView}
        userProfile={userProfile}
        onLogout={handleLogout}
        themeMode={themeMode}
        themePreference={themePreference}
        onSetThemePreference={handleSetThemePreference}
        onToggleTheme={toggleTheme}
      />

      {paymentNotification && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs ${
              paymentNotification.status === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span className="text-base">
                {paymentNotification.status === "success" ? "🎉" : "⚠️"}
              </span>
              <p>{paymentNotification.message}</p>
            </div>
            <button
              onClick={() => setPaymentNotification(null)}
              className="text-zinc-400 hover:text-zinc-700 font-mono text-xs font-bold px-2 py-1 hover:bg-zinc-100 rounded-md transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="grow">{renderMainContent()}</main>

      <Footer setCurrentView={handleSetView} themeMode={themeMode} />

      <FloatingAIAssistant
        userProfile={userProfile}
        onNavigate={handleSetView}
        themeMode={themeMode}
      />
    </div>
  );
}
