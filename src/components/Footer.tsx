import React from "react";
import { Stethoscope, Phone, Mail, MapPin, Clock, Heart } from "lucide-react";

interface FooterProps {
  setCurrentView: (view: string) => void;
  themeMode?: "light" | "dark";
}

export default function Footer({ setCurrentView, themeMode = "light" }: FooterProps) {
  const isDark = themeMode === "dark";

  return (
    <footer className={`font-sans border-t transition-colors duration-300 ${
      isDark ? "bg-zinc-950 text-zinc-300 border-zinc-800" : "bg-white text-zinc-600 border-zinc-100"
    }`}>
      {/* Upper footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setCurrentView("home")}
              id="footer-logo"
            >
              <div className={`p-2 rounded-lg ${isDark ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-white"}`}>
                <Stethoscope className={`h-4 w-4 ${isDark ? "text-zinc-950" : "text-emerald-400"}`} />
              </div>
              <span className={`text-base font-bold font-display tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                GodsCareHospital
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Our mission is to deliver comprehensive, high-quality healthcare services with compassion, expertise, and a commitment to green medical sustainability.
            </p>
            <div className="flex space-x-2 text-xs font-semibold items-center">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${isDark ? "text-emerald-400" : "text-zinc-500"}`}>24/7 ICU & Emergency Active</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className={`font-semibold font-display text-xs tracking-wider uppercase mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>Quick Links</h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => setCurrentView("home")}
                  className={`transition-colors cursor-pointer text-left ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
                >
                  Home Page
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView("departments")}
                  className={`transition-colors cursor-pointer text-left ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
                >
                  Medical Departments
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView("doctors")}
                  className={`transition-colors cursor-pointer text-left ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
                >
                  Our Specialists
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView("auth")}
                  className={`transition-colors cursor-pointer text-left ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
                >
                  Patient Portal Login
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3.5">
            <h3 className={`font-semibold font-display text-xs tracking-wider uppercase mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>Contact Info</h3>
            <div className={`flex items-start space-x-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              <Phone className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>Call Center</p>
                <p className={`hover:underline cursor-pointer ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>09037457567</p>
                <p className="text-[10px] text-emerald-500 font-medium font-mono">Emergency Support Active</p>
              </div>
            </div>
            <div className={`flex items-start space-x-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              <Mail className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>Email Address</p>
                <p className={`hover:underline cursor-pointer ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>austineisama150@gmail.com</p>
              </div>
            </div>
            <div className={`flex items-start space-x-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              <MapPin className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                450 Emerald Blvd, Wellness District, Seattle, WA 98101
              </p>
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <h3 className={`font-semibold font-display text-xs tracking-wider uppercase mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>Working Hours</h3>
            <ul className={`space-y-3 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              <li className={`flex justify-between items-center border-b pb-1.5 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Outpatient Clinic</span>
                <span className={`font-medium ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>8 AM - 6 PM</span>
              </li>
              <li className={`flex justify-between items-center border-b pb-1.5 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                <span>Saturday Sessions</span>
                <span className={`font-medium ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>9 AM - 2 PM</span>
              </li>
              <li className={`flex justify-between items-center border-b pb-1.5 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                <span>Sunday</span>
                <span className="text-zinc-400 font-semibold font-mono uppercase text-[10px] tracking-wider">Closed</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-medium">Emergency ICU</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase border ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-100 text-zinc-800 border-zinc-200"
                }`}>24 Hours</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lower footer */}
      <div className={`border-t py-6 ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 text-[11px] text-zinc-400">
          <p>© 2026 GodsCareHospital. All rights reserved.</p>
          <div className="flex items-center space-x-1">
            <span>Designed with refined clinical healing excellence.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
