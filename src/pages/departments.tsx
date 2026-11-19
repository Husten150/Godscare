import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PageLayout from "../components/PageLayout";
import Departments from "../components/Departments";
import { navigateToPage } from "../routes";

function DepartmentsPage() {
  return (
    <PageLayout currentView="departments">
      {({ themeMode }) => (
        <Departments
          onSelectDepartment={(deptName) =>
            navigateToPage("doctors", { department: deptName })
          }
          themeMode={themeMode}
        />
      )}
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DepartmentsPage />
  </StrictMode>
);
