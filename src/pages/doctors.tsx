import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import Doctors from "../components/Doctors";
import { Doctor, normalizeUserRole } from "../types";
import { navigateToPage } from "../routes";

function DoctorsPage() {
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("department") || "All Departments";
    } catch {
      return "All Departments";
    }
  });

  const handleSelectDepartment = (dept: string) => {
    setSelectedDepartment(dept);
    try {
      const url = new URL(window.location.href);
      if (!dept || dept === "All Departments") {
        url.searchParams.delete("department");
      } else {
        url.searchParams.set("department", dept);
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  };

  return (
    <PageLayout currentView="doctors">
      {({ userProfile, themeMode }) => (
        <Doctors
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={handleSelectDepartment}
          onBookDoctor={(doctor: Doctor) => {
            try {
              sessionStorage.setItem("godscare_booking_doctor", JSON.stringify(doctor));
            } catch {
              // ignore
            }
            if (userProfile) {
              const role = normalizeUserRole(userProfile.role, userProfile.email);
              if (role === "admin") {
                alert("Administrators cannot request patient appointments. Please use a patient profile to test booking.");
              } else {
                navigateToPage("dashboard", { bookDoctor: doctor.id });
              }
            } else {
              navigateToPage("auth", { bookDoctor: doctor.id });
            }
          }}
          themeMode={themeMode}
        />
      )}
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DoctorsPage />
  </StrictMode>
);
