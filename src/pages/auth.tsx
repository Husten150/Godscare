import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import Auth from "../components/Auth";

function AuthPage() {
  return (
    <PageLayout currentView="auth">
      {({ themeMode, handleAuthSuccess }) => (
        <Auth onAuthSuccess={handleAuthSuccess} themeMode={themeMode} />
      )}
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthPage />
  </StrictMode>
);
