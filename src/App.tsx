import React from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, Doctor } from "./types";

// Import custom components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./components/Home";
import Departments from "./components/Departments";
import Doctors from "./components/Doctors";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [currentView, setCurrentView] = React.useState<string>("home");
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [bookingDoctor, setBookingDoctor] = React.useState<Doctor | null>(null);
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>("All Departments");

  // Custom navigation handler to clear department filter when switching general views
  const handleSetView = (view: string) => {
    if (view !== "doctors") {
      setSelectedDepartment("All Departments");
    }
    setCurrentView(view);
  };

  // Monitor auth status dynamically on boot
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          // Fetch additional profile data from Firestore
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
            localStorage.setItem("greencare_session", JSON.stringify(profile));
            
            // Auto redirect based on role if logged in during session
            if (currentView === "auth") {
              setCurrentView(profile.role === "admin" ? "admin" : "dashboard");
            }
          } else {
            // No profile doc exists yet, handle gracefully (logout or set default)
            setUserProfile(null);
            localStorage.removeItem("greencare_session");
          }
        } else {
          // Check for local fallback session
          const localSessionStr = localStorage.getItem("greencare_session");
          if (localSessionStr) {
            try {
              const localProfile = JSON.parse(localSessionStr) as UserProfile;
              // Verify/update from Firestore
              const docSnap = await getDoc(doc(db, "users", localProfile.uid));
              if (docSnap.exists()) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                localStorage.setItem("greencare_session", JSON.stringify(profile));
                if (currentView === "auth") {
                  setCurrentView(profile.role === "admin" ? "admin" : "dashboard");
                }
              } else {
                setUserProfile(localProfile);
                if (currentView === "auth") {
                  setCurrentView(localProfile.role === "admin" ? "admin" : "dashboard");
                }
              }
            } catch (e) {
              console.error("Local session fetch error:", e);
              setUserProfile(null);
              localStorage.removeItem("greencare_session");
              if (currentView === "dashboard" || currentView === "admin") {
                setCurrentView("home");
              }
            }
          } else {
            setUserProfile(null);
            // If viewing protected view, redirect to home
            if (currentView === "dashboard" || currentView === "admin") {
              setCurrentView("home");
            }
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

  // Handle successful login
  const handleAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("greencare_session", JSON.stringify(profile));
    
    // If we have a pending doctor booking, route to dashboard, otherwise route by role
    if (bookingDoctor && profile.role === "patient") {
      setCurrentView("dashboard");
    } else {
      setCurrentView(profile.role === "admin" ? "admin" : "dashboard");
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
      setCurrentView("home");
    }
  };

  // Routing trigger from department listings to doctor list with search filter
  const handleSelectDepartment = (deptName: string) => {
    setSelectedDepartment(deptName);
    setCurrentView("doctors");
    // This will set the search filter in Doctors automatically
    setBookingDoctor(null); 
  };

  // Booking CTA clicked on Doctor Card
  const handleBookDoctor = (doctor: Doctor) => {
    setBookingDoctor(doctor);
    if (userProfile) {
      if (userProfile.role === "admin") {
        alert("Administrators cannot request patient appointments. Please use a patient profile to test booking.");
      } else {
        setCurrentView("dashboard");
      }
    } else {
      // Redirect to login, but save the pending booking doctor!
      setCurrentView("auth");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Header */}
      <Header 
        currentView={currentView} 
        setCurrentView={handleSetView} 
        userProfile={userProfile} 
        onLogout={handleLogout} 
      />

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
              />
            )}
            
            {currentView === "departments" && (
              <Departments onSelectDepartment={handleSelectDepartment} />
            )}
            
            {currentView === "doctors" && (
              <Doctors 
                selectedDepartment={selectedDepartment} 
                setSelectedDepartment={setSelectedDepartment}
                onBookDoctor={handleBookDoctor} 
              />
            )}

            {currentView === "auth" && (
              <Auth onAuthSuccess={handleAuthSuccess} />
            )}

            {currentView === "dashboard" && userProfile && userProfile.role === "patient" && (
              <Dashboard 
                userProfile={userProfile} 
                initialSelectedDoctor={bookingDoctor}
                clearInitialDoctorSelection={() => setBookingDoctor(null)}
              />
            )}

            {currentView === "admin" && userProfile && userProfile.role === "admin" && (
              <AdminPanel />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer setCurrentView={handleSetView} />
    </div>
  );
}
