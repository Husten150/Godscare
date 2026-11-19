import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import AdminAdministratorDashboard from "../components/AdminAdministratorDashboard";

function DirectorPage() {
  return (
    <PageLayout
      currentView="admin_administrator"
      requireAuth
      allowedRoles={["admin_administrator"]}
    >
      {({ themeMode }) => <AdminAdministratorDashboard themeMode={themeMode} />}
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectorPage />
  </StrictMode>
);
