export type AppView =
  | "home"
  | "departments"
  | "doctors"
  | "auth"
  | "dashboard"
  | "admin"
  | "admin_administrator";

export const VIEW_PATHS: Record<AppView, string> = {
  home: "/",
  departments: "/departments",
  doctors: "/doctors",
  auth: "/auth",
  dashboard: "/dashboard",
  admin: "/admin",
  admin_administrator: "/director",
};

export function getRoutePath(
  view: string,
  params?: Record<string, string | undefined>
): string {
  const basePath = VIEW_PATHS[view as AppView] || "/";
  if (!params) return basePath;

  const search = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== "") {
      search.set(key, val);
    }
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function navigateToPage(
  view: string,
  params?: Record<string, string | undefined>,
  replace = false
): void {
  const targetUrl = getRoutePath(view, params);
  if (replace) {
    window.location.replace(targetUrl);
  } else {
    window.location.href = targetUrl;
  }
}

export function getCurrentViewFromPath(pathname = window.location.pathname): AppView {
  const clean = pathname.replace(/\/+$/, "").toLowerCase();
  if (clean === "" || clean === "/index.html") return "home";
  if (clean === "/departments" || clean === "/departments.html") return "departments";
  if (clean === "/doctors" || clean === "/doctors.html") return "doctors";
  if (clean === "/auth" || clean === "/auth.html") return "auth";
  if (clean === "/dashboard" || clean === "/dashboard.html") return "dashboard";
  if (clean === "/admin" || clean === "/admin.html") return "admin";
  if (
    clean === "/director" ||
    clean === "/director.html" ||
    clean === "/admin-administrator" ||
    clean === "/admin_administrator"
  ) {
    return "admin_administrator";
  }
  return "home";
}
