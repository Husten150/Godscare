import React from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, Doctor, normalizeUserRole } from "./types";
import { Shield, Lock, ArrowRight, UserCheck, Stethoscope, RefreshCw } from "lucide-react";

// Import custom components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./components/Home";
import Departments from "./components/Departments";
import Doctors from "./components/Doctors";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import AdminAdministratorDashboard from "./components/AdminAdministratorDashboard";
import FloatingAIAssistant from "./components/FloatingAIAssistant";

export default function App() {
  const getInitialView = (): string => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      if (viewParam && ["home", "departments", "doctors", "auth", "dashboard", "admin", "admin_administrator"].includes(viewParam)) {
        return viewParam;
      }
    } catch (e) {
      console.error("URL parse error:", e);
    }
    return "home";
  };

  const [currentView, setCurrentView] = React.useState<string>(getInitialView);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [bookingDoctor, setBookingDoctor] = React.useState<Doctor | null>(null);
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>("All Departments");
  const [paymentNotification, setPaymentNotification] = React.useState<{ status: "success" | "error"; message: string } | null>(null);

  // Device & User Theme Preference Mode ("system" | "light" | "dark")
  const [themePreference, setThemePreference] = React.useState<"system" | "light" | "dark">(() => {
    const saved = localStorage.getItem("godscare_theme_preference");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    // Legacy fallback check
    const legacy = localStorage.getItem("godscare_theme");
    if (legacy === "light" || legacy === "dark") return legacy;
    return "system"; // Standard default: align with device brightness & dark mode
  });

  // Track the actual device OS / browser dark mode preference in real-time
  const [systemPrefersDark, setSystemPrefersDark] = React.useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Listen to live device/system color scheme changes
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPrefersDark(e.matches);
    };

    // Initial check
    handleSystemThemeChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, []);

  // Compute active themeMode ("light" or "dark") based on preference and device state
  const themeMode: "light" | "dark" = 
    themePreference === "system" 
      ? (systemPrefersDark ? "dark" : "light") 
      : themePreference;

  // Sync HTML & Body tags with active themeMode
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
    localStorage.removeItem("godscare_theme"); // Clear legacy
  };

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    handleSetThemePreference(next);
  };

  // Custom navigation handler synchronizing with HTML5 window.history
  const navigateToView = React.useCallback((view: string, replace = false) => {
    if (view !== "doctors") {
      setSelectedDepartment("All Departments");
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);

      if (replace) {
        window.history.replaceState({ view }, "", url.toString());
      } else if (window.history.state?.view !== view) {
        window.history.pushState({ view }, "", url.toString());
      }
    } catch (e) {
      console.error("History sync error:", e);
    }
  }, []);

  const handleSetView = (view: string) => {
    navigateToView(view, false);
  };

  // Sync window.history and handle popstate (browser/UI Back & Forward buttons)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewFromUrl = params.get("view") || currentView;
    if (!window.history.state || window.history.state.view !== viewFromUrl) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("view", viewFromUrl);
        window.history.replaceState({ view: viewFromUrl }, "", url.toString());
      } catch (e) {
        console.error("Initial history setup error:", e);
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      let targetView = "home";
      if (e.state && e.state.view) {
        targetView = e.state.view;
      } else {
        const p = new URLSearchParams(window.location.search);
        targetView = p.get("view") || "home";
      }

      if (targetView !== "doctors") {
        setSelectedDepartment("All Departments");
      }
      setCurrentView(targetView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check URL query parameters for payment status on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const type = params.get("type");
    const message = params.get("message");

    if (payment === "success") {
      let friendlyType = "your transaction";
      if (type === "premium") friendlyType = "your premium care subscription upgrade";
      else if (type === "appointment") friendlyType = "your clinical appointment booking fee";
      else if (type === "bill") friendlyType = "your outstanding medical invoice payment";
      else if (type === "medicine") friendlyType = "your prescribed pharmacy medication order";

      setPaymentNotification({
        status: "success",
        message: `Payment for ${friendlyType} has been successfully verified! Your clinical record is fully updated.`
      });

      // Auto-route to dashboard/admin if logged in
      const sessionStr = localStorage.getItem("greencare_session");
      if (sessionStr) {
        try {
          const profile = JSON.parse(sessionStr);
          navigateToView(profile.role === "admin" ? "admin" : "dashboard", true);
        } catch (e) {
          console.error(e);
        }
      }

      // Clean the URL payment query params while keeping current view in history
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("payment");
      cleanUrl.searchParams.delete("type");
      cleanUrl.searchParams.delete("message");
      window.history.replaceState({ view: currentView }, document.title, cleanUrl.toString());
    } else if (payment === "error") {
      setPaymentNotification({
        status: "error",
        message: `Payment verification failed: ${message || "the transaction could not be completed."}`
      });
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("payment");
      cleanUrl.searchParams.delete("type");
      cleanUrl.searchParams.delete("message");
      window.history.replaceState({ view: currentView }, document.title, cleanUrl.toString());
    }
  }, []);

  // Monitor auth status dynamically on boot
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          // Fetch additional profile data from Firestore
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
                phone: data.phone
              };
            } else {
              const normRole = normalizeUserRole("patient", firebaseUser.email);
              profile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: firebaseUser.displayName || (normRole === "admin_administrator" ? "Hospital Director" : "User"),
                role: normRole,
                createdAt: new Date().toISOString()
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
              createdAt: new Date().toISOString()
            };
          }

          setUserProfile(profile);
          localStorage.setItem("greencare_session", JSON.stringify(profile));

          // Auto redirect if currently stuck on auth view
          if (currentView === "auth") {
            const target = profile.role === "admin_administrator" ? "admin_administrator" : profile.role === "admin" ? "admin" : "dashboard";
            navigateToView(target, true);
          }
        } else {
          // Check for local fallback session
          const localSessionStr = localStorage.getItem("greencare_session");
          if (localSessionStr) {
            try {
              const localProfile = JSON.parse(localSessionStr) as UserProfile;
              const normRole = normalizeUserRole(localProfile.role, localProfile.email);
              const normalized = { ...localProfile, role: normRole };
              setUserProfile(normalized);
              if (currentView === "auth") {
                navigateToView(normRole === "admin_administrator" ? "admin_administrator" : normRole === "admin" ? "admin" : "dashboard", true);
              }
            } catch (e) {
              console.error("Local session fetch error:", e);
              setUserProfile(null);
              localStorage.removeItem("greencare_session");
            }
          } else {
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.error("Auth sync error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentView]);

  // Direct fast login for Admin Administrator or Staff Admin
  const handleQuickAdminLogin = (targetRole: "admin_administrator" | "admin") => {
    const isDirector = targetRole === "admin_administrator";
    const profile: UserProfile = {
      uid: isDirector ? "raq1d2nejnfM2ppR3fFWgfAWVTI2" : "CXVoNBATtmNBP6cFm9boNF4Fphc2",
      email: isDirector ? "hustenisama@gmail.com" : "admin@greencare.com",
      name: isDirector ? "Augustine Isama (Hospital Director)" : "Chief Administrator",
      role: isDirector ? "admin_administrator" : "admin",
      createdAt: new Date().toISOString()
    };
    setUserProfile(profile);
    localStorage.setItem("greencare_session", JSON.stringify(profile));
    navigateToView(isDirector ? "admin_administrator" : "admin");
  };

  // Handle successful login
  const handleAuthSuccess = (profile: UserProfile) => {
    const normRole = normalizeUserRole(profile.role, profile.email);
    const normalizedProfile = { ...profile, role: normRole };
    setUserProfile(normalizedProfile);
    localStorage.setItem("greencare_session", JSON.stringify(normalizedProfile));
    
    // If we have a pending doctor booking, route to dashboard, otherwise route by role
    if (bookingDoctor && normRole === "patient") {
      navigateToView("dashboard");
    } else {
      const target = normRole === "admin_administrator" ? "admin_administrator" : normRole === "admin" ? "admin" : "dashboard";
      navigateToView(target);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      localStorage.removeItem("greencare_session");
      setUserProfile(null);
      setBookingDoctor(null);
      navigateToView("home");
    }
  };

  // Routing trigger from department listings to doctor list with search filter
  const handleSelectDepartment = (deptName: string) => {
    setSelectedDepartment(deptName);
    setBookingDoctor(null);
    navigateToView("doctors");
  };

  // Booking CTA clicked on Doctor Card
  const handleBookDoctor = (doctor: Doctor) => {
    setBookingDoctor(doctor);
    if (userProfile) {
      if (userProfile.role === "admin") {
        alert("Administrators cannot request patient appointments. Please use a patient profile to test booking.");
      } else {
        navigateToView("dashboard");
      }
    } else {
      // Redirect to login, but save the pending booking doctor!
      navigateToView("auth");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 selection:bg-emerald-100 selection:text-emerald-900 ${
      themeMode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-zinc-900"
    }`}>
      
      {/* Header */}
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

      {/* Floating alert banner for verification notifications */}
      {paymentNotification && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs ${
            paymentNotification.status === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
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

      {/* Main Content View Switcher */}
      <main className="grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-sans text-sm font-semibold tracking-tight">Syncing encrypted medical records...</p>
          </div>
        ) : (
          <>
            {currentView === "home" && (
              <Home 
                setCurrentView={handleSetView} 
                userLoggedIn={!!userProfile} 
                themeMode={themeMode}
                onToggleTheme={toggleTheme}
              />
            )}
            
            {currentView === "departments" && (
              <Departments onSelectDepartment={handleSelectDepartment} themeMode={themeMode} />
            )}
            
            {currentView === "doctors" && (
              <Doctors 
                selectedDepartment={selectedDepartment} 
                setSelectedDepartment={setSelectedDepartment}
                onBookDoctor={handleBookDoctor} 
                themeMode={themeMode}
              />
            )}

            {currentView === "auth" && (
              <Auth onAuthSuccess={handleAuthSuccess} themeMode={themeMode} />
            )}

            {currentView === "dashboard" && userProfile && normalizeUserRole(userProfile.role, userProfile.email) === "patient" && (
              <Dashboard 
                userProfile={userProfile} 
                initialSelectedDoctor={bookingDoctor}
                clearInitialDoctorSelection={() => setBookingDoctor(null)}
                themeMode={themeMode}
              />
            )}

            {/* Staff Admin Panel View */}
            {currentView === "admin" && userProfile && normalizeUserRole(userProfile.role, userProfile.email) === "admin" && (
              <AdminPanel themeMode={themeMode} />
            )}

            {/* Admin Administrator (Director) View */}
            {(currentView === "admin_administrator" || (currentView === "admin" && userProfile && normalizeUserRole(userProfile.role, userProfile.email) === "admin_administrator")) && userProfile && normalizeUserRole(userProfile.role, userProfile.email) === "admin_administrator" && (
              <AdminAdministratorDashboard themeMode={themeMode} />
            )}

            {/* If on admin view as staff admin, but clicked Admin Administrator view */}
            {currentView === "admin_administrator" && userProfile && normalizeUserRole(userProfile.role, userProfile.email) === "admin" && (
              <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className={`p-8 rounded-2xl border ${themeMode === "dark" ? "bg-zinc-900/80 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"} shadow-xl`}>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold font-display mb-2">Hospital Director Access Required</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                    You are signed in as Staff Admin ({userProfile.email}). Modifying hospital prices, altering doctor profiles, and full site reconfiguration is reserved for the Admin Administrator (Director).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => handleSetView("admin")}
                      className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer"
                    >
                      Open Staff Admin Panel
                    </button>
                    <button
                      onClick={() => handleQuickAdminLogin("admin_administrator")}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Switch to Director (hustenisama@gmail.com)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If patient attempts to access admin views */}
            {(currentView === "admin" || currentView === "admin_administrator") && userProfile && normalizeUserRole(userProfile.role, userProfile.email) === "patient" && (
              <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className={`p-8 rounded-2xl border ${themeMode === "dark" ? "bg-zinc-900/80 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"} shadow-xl`}>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold font-display mb-2">Administrative Console Restricted</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                    You are signed in with a Patient account ({userProfile.email}). This area is restricted to the Admin Administrator (Hospital Director) and clinical staff.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => handleSetView("dashboard")}
                      className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer"
                    >
                      Return to My Patient Dashboard
                    </button>
                    <button
                      onClick={() => handleQuickAdminLogin("admin_administrator")}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Enter as Admin Administrator (hustenisama@gmail.com)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If not logged in and visiting admin or admin_administrator */}
            {(currentView === "admin" || currentView === "admin_administrator") && !userProfile && (
              <div className="max-w-4xl mx-auto px-4 py-12">
                <div className={`p-8 sm:p-10 rounded-3xl border ${themeMode === "dark" ? "bg-zinc-900/90 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"} shadow-2xl`}>
                  <div className="text-center max-w-xl mx-auto mb-10">
                    <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-3 shadow-inner">
                      <Shield className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight mb-2">
                      Hospital Administration Portal
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                      Welcome to GodsCare Hospital Management. Select an administrative role or sign in below to open the dashboard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Admin Administrator Card */}
                    <div className={`p-6 rounded-2xl border transition-all ${
                      themeMode === "dark" 
                        ? "bg-zinc-950/60 border-amber-500/30 hover:border-amber-500/60" 
                        : "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                    } shadow-md flex flex-col justify-between`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Super Admin (In Charge)
                          </span>
                          <Shield className="h-5 w-5 text-amber-500" />
                        </div>
                        <h3 className="text-base font-bold font-display">
                          Admin Administrator Console
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Full site oversight: add/edit/delete doctors, set consultation fees, configure hospital billing prices, broadcast announcements, and inspect all patients & payments.
                        </p>
                        <div className="text-[11px] font-mono text-amber-500 font-semibold">
                          Director: hustenisama@gmail.com
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuickAdminLogin("admin_administrator")}
                        className="mt-6 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                        id="btn-gateway-admin-admin"
                      >
                        <span>Launch Director Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Staff Admin Card */}
                    <div className={`p-6 rounded-2xl border transition-all ${
                      themeMode === "dark" 
                        ? "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700" 
                        : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                    } shadow-md flex flex-col justify-between`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Clinical Admin
                          </span>
                          <UserCheck className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className="text-base font-bold font-display">
                          Staff Administration Panel
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Oversee patient details, examine patient billing records and payments made, review appointments, and track pharmacy prescriptions.
                        </p>
                        <div className="text-[11px] font-mono text-blue-500 font-semibold">
                          Staff: admin@greencare.com
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuickAdminLogin("admin")}
                        className="mt-6 w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                        id="btn-gateway-staff-admin"
                      >
                        <span>Launch Staff Admin Panel</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
                    <button
                      onClick={() => handleSetView("auth")}
                      className="text-xs font-sans text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors underline cursor-pointer"
                    >
                      Or sign in with custom password on the standard Login page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer setCurrentView={handleSetView} themeMode={themeMode} />

      {/* Global Moveable Floating AI Clinical Assistant */}
      <FloatingAIAssistant 
        userProfile={userProfile} 
        onNavigate={handleSetView} 
        themeMode={themeMode} 
      />
    </div>
  );
}
