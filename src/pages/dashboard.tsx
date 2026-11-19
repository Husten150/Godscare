import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import Dashboard from "../components/Dashboard";
import { Doctor } from "../types";

function DashboardPage() {
  const [bookingDoctor, setBookingDoctor] = React.useState<Doctor | null>(() => {
    try {
      const saved = sessionStorage.getItem("godscare_booking_doctor");
      if (saved) return JSON.parse(saved) as Doctor;
    } catch {
      // ignore
    }
    return null;
  });

  const clearInitialDoctorSelection = () => {
    setBookingDoctor(null);
    try {
      sessionStorage.removeItem("godscare_booking_doctor");
      const url = new URL(window.location.href);
      if (url.searchParams.has("bookDoctor")) {
        url.searchParams.delete("bookDoctor");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // ignore
    }
  };

  return (
    <PageLayout currentView="dashboard" requireAuth allowedRoles={["patient"]}>
      {({ userProfile, themeMode }) =>
        userProfile ? (
          <Dashboard
            userProfile={userProfile}
            initialSelectedDoctor={bookingDoctor}
            clearInitialDoctorSelection={clearInitialDoctorSelection}
            themeMode={themeMode}
          />
        ) : null
      }
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DashboardPage />
  </StrictMode>
);
