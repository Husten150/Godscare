import React from "react";
import { Stethoscope, User, LogIn, LogOut, Menu, X, Shield, LayoutDashboard, Sun, Moon, Monitor } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  themeMode?: "light" | "dark";
  themePreference?: "system" | "light" | "dark";
  onSetThemePreference?: (pref: "system" | "light" | "dark") => void;
  onToggleTheme?: () => void;
}

export default function Header({ 
  currentView, 
  setCurrentView, 
  userProfile, 
  onLogout, 
  themeMode = "light", 
  themePreference = "system",
  onSetThemePreference,
  onToggleTheme 
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "departments", label: "Departments" },
    { id: "doctors", label: "Our Doctors" },
  ];

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId);
    setIsMobileMenuOpen(false);
  };

  const isDark = themeMode === "dark";

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
      isDark ? "bg-zinc-950/95 text-zinc-100 border-zinc-800/80" : "bg-white/95 text-zinc-900 border-zinc-100"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2">
            <div 
              className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group"
              onClick={() => handleNavClick("home")}
              id="header-logo"
            >
              <div className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isDark ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-white group-hover:bg-zinc-800"}`}>
                <Stethoscope className={`h-4 w-4 sm:h-5 sm:w-5 ${isDark ? "text-zinc-950" : "text-emerald-400"}`} />
              </div>
              <span className={`text-base sm:text-lg font-bold font-display tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                GodsCareHospital
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`font-sans font-medium text-xs tracking-wide uppercase transition-colors cursor-pointer ${
                  currentView === item.id 
                    ? isDark ? "text-emerald-400 border-b-2 border-emerald-400 pb-1 font-bold" : "text-zinc-900 border-b border-zinc-900 pb-1 font-semibold"
                    : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                }`}
                id={`nav-${item.id}`}
              >
                {item.label}
              </button>
            ))}

            {userProfile && (
              <>
                {userProfile.role === "patient" && (
                  <button
                    onClick={() => handleNavClick("dashboard")}
                    className={`font-sans font-medium text-xs tracking-wide uppercase transition-colors flex items-center space-x-1 cursor-pointer ${
                      currentView === "dashboard"
                        ? isDark ? "text-emerald-400 border-b-2 border-emerald-400 pb-1 font-bold" : "text-zinc-900 border-b border-zinc-900 pb-1 font-semibold"
                        : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                    id="nav-dashboard"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>My Dashboard</span>
                  </button>
                )}
                {userProfile.role === "admin" && (
                  <button
                    onClick={() => handleNavClick("admin")}
                    className={`font-sans font-medium text-xs tracking-wide uppercase transition-colors flex items-center space-x-1 cursor-pointer ${
                      currentView === "admin"
                        ? isDark ? "text-emerald-400 border-b-2 border-emerald-400 pb-1 font-bold" : "text-zinc-900 border-b border-zinc-900 pb-1 font-semibold"
                        : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                    id="nav-admin"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Right-side controls: Theme Switcher & Auth / Profile */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Professional Standard Theme Switcher (System / Light / Dark) */}
            {onSetThemePreference ? (
              <div 
                className={`p-0.5 rounded-xl border flex items-center shadow-2xs ${
                  isDark 
                    ? "bg-zinc-900 border-zinc-800" 
                    : "bg-zinc-100 border-zinc-200/80"
                }`}
                id="header-theme-selector"
              >
                <button
                  type="button"
                  onClick={() => onSetThemePreference("light")}
                  title="Light Mode"
                  aria-label="Set Light Mode"
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 text-xs ${
                    themePreference === "light"
                      ? isDark 
                        ? "bg-zinc-800 text-white shadow-xs font-bold" 
                        : "bg-white text-zinc-900 shadow-xs font-bold"
                      : isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <Sun className={`h-3.5 w-3.5 ${themePreference === "light" ? "text-amber-500 fill-amber-400" : ""}`} />
                  <span className="text-[10px] font-medium">Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetThemePreference("dark")}
                  title="Dark Mode"
                  aria-label="Set Dark Mode"
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 text-xs ${
                    themePreference === "dark"
                      ? isDark 
                        ? "bg-zinc-800 text-white shadow-xs font-bold" 
                        : "bg-white text-zinc-900 shadow-xs font-bold"
                      : isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <Moon className={`h-3.5 w-3.5 ${themePreference === "dark" ? "text-sky-400 fill-sky-300" : ""}`} />
                  <span className="text-[10px] font-medium">Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetThemePreference("system")}
                  title="System / Device Mode (Matches your device display settings)"
                  aria-label="Set System / Device Mode"
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 text-xs ${
                    themePreference === "system"
                      ? isDark 
                        ? "bg-zinc-800 text-emerald-400 shadow-xs font-bold border border-emerald-500/30" 
                        : "bg-white text-emerald-700 shadow-xs font-bold border border-emerald-500/30"
                      : isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium">Device</span>
                </button>
              </div>
            ) : onToggleTheme ? (
              <button
                onClick={onToggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Theme Mode"
                className={`p-1 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center space-x-1 ${
                  isDark 
                    ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" 
                    : "bg-zinc-100 border-zinc-200/80 hover:border-zinc-300"
                }`}
                id="btn-header-theme-toggle"
              >
                <div className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                  !isDark ? "bg-white text-zinc-900 shadow-xs font-bold" : "text-zinc-400 hover:text-zinc-200 opacity-60"
                }`}>
                  <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  <span className="text-[10px] font-medium">Light</span>
                </div>
                <div className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                  isDark ? "bg-zinc-800 text-white shadow-xs font-bold" : "text-zinc-500 hover:text-zinc-800 opacity-60"
                }`}>
                  <Moon className="h-3.5 w-3.5 text-sky-400 fill-sky-300 shrink-0" />
                  <span className="text-[10px] font-medium">Dark</span>
                </div>
              </button>
            ) : null}

            {userProfile ? (
              <div className="flex items-center space-x-3">
                {/* Clickable Username / Profile Badge */}
                <button
                  onClick={() => handleNavClick(userProfile.role === "admin" ? "admin" : "dashboard")}
                  title="Click to view your profile & dashboard"
                  className={`flex items-center space-x-2 text-xs p-1.5 rounded-xl transition-all cursor-pointer border group ${
                    isDark 
                      ? "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-200" 
                      : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200/80 text-zinc-800"
                  }`}
                  id="btn-user-profile-header"
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold uppercase border transition-colors ${
                    isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-zinc-950" : "bg-emerald-100 text-emerald-800 border-emerald-200 group-hover:bg-zinc-900 group-hover:text-white"
                  }`}>
                    {userProfile.name.charAt(0)}
                  </div>
                  <span className="font-bold max-w-[120px] truncate underline-offset-2 group-hover:underline" title={userProfile.name}>
                    {userProfile.name}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 font-medium rounded-full border uppercase tracking-wider ${
                    isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-200 text-zinc-700 border-zinc-300"
                  }`}>
                    {userProfile.role}
                  </span>
                  {userProfile.isPremium && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full border border-amber-400 uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                      ★ Prem
                    </span>
                  )}
                </button>

                <button
                  onClick={onLogout}
                  className={`flex items-center space-x-1 px-3 py-2 border rounded-xl text-xs transition-all cursor-pointer font-medium ${
                    isDark 
                      ? "border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900" 
                      : "border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                  id="btn-logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick("auth")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs transition-all cursor-pointer font-semibold tracking-wide uppercase shadow-xs ${
                  isDark 
                    ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950" 
                    : "bg-zinc-900 hover:bg-zinc-800 text-white"
                }`}
                id="btn-login-header"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Patient Portal</span>
              </button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center space-x-2 md:hidden">
            {onSetThemePreference ? (
              <div 
                className={`p-0.5 rounded-lg border flex items-center shadow-2xs ${
                  isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSetThemePreference("light")}
                  aria-label="Light mode"
                  className={`p-1 rounded-md transition-all ${
                    themePreference === "light" 
                      ? isDark ? "bg-zinc-800 text-white shadow-xs" : "bg-white text-zinc-900 shadow-xs" 
                      : "text-zinc-400"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetThemePreference("dark")}
                  aria-label="Dark mode"
                  className={`p-1 rounded-md transition-all ${
                    themePreference === "dark" 
                      ? isDark ? "bg-zinc-800 text-white shadow-xs" : "bg-white text-zinc-900 shadow-xs" 
                      : "text-zinc-400"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetThemePreference("system")}
                  aria-label="Device mode"
                  className={`p-1 rounded-md transition-all ${
                    themePreference === "system" 
                      ? isDark ? "bg-zinc-800 text-emerald-400 shadow-xs" : "bg-white text-emerald-700 shadow-xs" 
                      : "text-zinc-400"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : onToggleTheme ? (
              <button
                onClick={onToggleTheme}
                title="Toggle Theme Mode"
                aria-label="Toggle Theme Mode"
                className={`p-1 rounded-xl border transition-all cursor-pointer flex items-center space-x-1 ${
                  isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                }`}
              >
                <div className={`px-2 py-0.5 rounded-lg flex items-center space-x-1 ${!isDark ? "bg-white text-zinc-900 shadow-xs font-bold" : "text-zinc-400 opacity-60"}`}>
                  <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  <span className="text-[9px] font-mono uppercase">Light</span>
                </div>
                <div className={`px-2 py-0.5 rounded-lg flex items-center space-x-1 ${isDark ? "bg-zinc-800 text-white shadow-xs font-bold" : "text-zinc-500 opacity-60"}`}>
                  <Moon className="h-3.5 w-3.5 text-sky-400 fill-sky-300 shrink-0" />
                  <span className="text-[9px] font-mono uppercase">Dark</span>
                </div>
              </button>
            ) : null}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-lg cursor-pointer ${isDark ? "text-zinc-300 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
              aria-label="Toggle menu"
              id="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={`md:hidden border-t px-4 py-3 space-y-2 shadow-sm ${
          isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-100 text-zinc-900"
        }`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left px-3 py-2 rounded-md font-sans font-medium text-sm cursor-pointer ${
                currentView === item.id 
                  ? isDark ? "bg-zinc-900 text-emerald-400 font-bold" : "bg-zinc-50 text-zinc-900 font-semibold"
                  : isDark ? "text-zinc-300 hover:bg-zinc-900" : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </button>
          ))}

          {userProfile && (
            <>
              {userProfile.role === "patient" && (
                <button
                  onClick={() => handleNavClick("dashboard")}
                  className={`block w-full text-left px-3 py-2 rounded-md font-sans font-medium text-sm cursor-pointer ${
                    currentView === "dashboard"
                      ? isDark ? "bg-zinc-900 text-emerald-400 font-bold" : "bg-zinc-50 text-zinc-900 font-semibold"
                      : isDark ? "text-zinc-300 hover:bg-zinc-900" : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
                  }`}
                >
                  My Dashboard
                </button>
              )}
              {userProfile.role === "admin" && (
                <button
                  onClick={() => handleNavClick("admin")}
                  className={`block w-full text-left px-3 py-2 rounded-md font-sans font-medium text-sm cursor-pointer ${
                    currentView === "admin"
                      ? isDark ? "bg-zinc-900 text-emerald-400 font-bold" : "bg-zinc-50 text-zinc-900 font-semibold"
                      : isDark ? "text-zinc-300 hover:bg-zinc-900" : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </>
          )}

          <div className={`border-t pt-3 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
            {userProfile ? (
              <div className="space-y-3 px-3">
                <div 
                  onClick={() => {
                    handleNavClick(userProfile.role === "admin" ? "admin" : "dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-3 text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isDark ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-900"
                  }`}
                  title="Click to view your profile"
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold uppercase border ${
                    isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}>
                    {userProfile.name.charAt(0)}
                  </div>
                  <div>
                    <div className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{userProfile.name}</div>
                    <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider font-semibold">Click to open profile</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center space-x-1 py-2 border rounded-lg text-xs font-medium cursor-pointer ${
                    isDark ? "border-zinc-800 text-zinc-300 bg-zinc-900" : "border-zinc-200 text-zinc-600 bg-zinc-50"
                  }`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick("auth")}
                className={`w-full py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  isDark ? "bg-emerald-500 text-zinc-950 font-bold" : "bg-zinc-900 text-white"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In to Patient Portal</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

