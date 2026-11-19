import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import AdminPanel from "../components/AdminPanel";
import AdminAdministratorDashboard from "../components/AdminAdministratorDashboard";
import { normalizeUserRole } from "../types";

function AdminPage() {
  return (
    <PageLayout
      currentView="admin"
      requireAuth
      allowedRoles={["admin", "admin_administrator"]}
    >
      {({ userProfile, themeMode }) => {
        if (!userProfile) return null;
        const role = normalizeUserRole(userProfile.role, userProfile.email);
        if (role === "admin_administrator") {
          return <AdminAdministratorDashboard themeMode={themeMode} />;
        }
        return <AdminPanel themeMode={themeMode} />;
      }}
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminPage />
  </StrictMode>
);
