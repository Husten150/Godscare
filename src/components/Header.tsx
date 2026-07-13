import React from "react";
import { Stethoscope, User, LogIn, LogOut, Menu, X, Shield, LayoutDashboard } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Header({ currentView, setCurrentView, userProfile, onLogout }: HeaderProps) {
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

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => handleNavClick("home")}
            id="header-logo"
          >
            <div className="p-2 bg-zinc-900 rounded-lg text-white group-hover:bg-zinc-800 transition-colors">
              <Stethoscope className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold font-display text-zinc-900 tracking-tight">
              GodsCareHospital
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`font-sans font-medium text-xs tracking-wide uppercase transition-colors cursor-pointer ${
                  currentView === item.id 
                    ? "text-zinc-900 border-b border-zinc-900 pb-1 font-semibold" 
                    : "text-zinc-500 hover:text-zinc-900"
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
                        ? "text-zinc-900 border-b border-zinc-900 pb-1 font-semibold"
                        : "text-zinc-500 hover:text-zinc-900"
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
                        ? "text-zinc-900 border-b border-zinc-900 pb-1 font-semibold"
                        : "text-zinc-500 hover:text-zinc-900"
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

          {/* Auth Button */}
          <div className="hidden md:flex items-center space-x-4">
            {userProfile ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-xs text-zinc-700">
                  <div className="h-7 w-7 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-800 font-bold uppercase border border-zinc-200">
                    {userProfile.name.charAt(0)}
                  </div>
                  <span className="font-semibold max-w-[120px] truncate" title={userProfile.name}>
                    {userProfile.name}
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-100 text-zinc-600 font-medium rounded-full border border-zinc-200 uppercase tracking-wider">
                    {userProfile.role}
                  </span>
                  {userProfile.isPremium && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full border border-amber-400 uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                      ★ Prem
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 border border-zinc-200 hover:border-zinc-300 rounded-lg text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer font-medium"
                  id="btn-logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick("auth")}
                className="flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs transition-all cursor-pointer font-medium tracking-wide uppercase"
                id="btn-login-header"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Patient Portal</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-zinc-500 hover:text-zinc-900 p-2 rounded-lg cursor-pointer"
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
        <div className="md:hidden bg-white border-t border-zinc-100 px-4 py-3 space-y-2 shadow-sm">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left px-3 py-2 rounded-md font-sans font-medium text-sm cursor-pointer ${
                currentView === item.id 
                  ? "bg-zinc-50 text-zinc-900 font-semibold" 
                  : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
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
                      ? "bg-zinc-50 text-zinc-900 font-semibold"
                      : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
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
                      ? "bg-zinc-50 text-zinc-900 font-semibold"
                      : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </>
          )}

          <div className="border-t border-zinc-100 pt-3">
            {userProfile ? (
              <div className="space-y-3 px-3">
                <div className="flex items-center space-x-3 text-xs">
                  <div className="h-8 w-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-800 font-bold uppercase border border-zinc-200">
                    {userProfile.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900">{userProfile.name}</div>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{userProfile.role} profile</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center space-x-2 px-4 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-50 font-medium transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick("auth")}
                className="flex w-full items-center justify-center space-x-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-all cursor-pointer uppercase tracking-wider"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Patient Portal Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
