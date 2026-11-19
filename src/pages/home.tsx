import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import Home from "../components/Home";
import { navigateToPage } from "../routes";

function HomePage() {
  return (
    <PageLayout currentView="home">
      {({ userProfile, themeMode, toggleTheme }) => (
        <Home
          setCurrentView={(view) => navigateToPage(view)}
          userLoggedIn={!!userProfile}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
        />
      )}
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HomePage />
  </StrictMode>
);
