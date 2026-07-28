import React from "react";
import { Stethoscope, Phone, Mail, MapPin, Clock, Heart } from "lucide-react";

interface FooterProps {
  setCurrentView: (view: string) => void;
}

export default function Footer({ setCurrentView }: FooterProps) {
  return (
    <footer className="bg-white text-zinc-600 border-t border-zinc-100 font-sans">
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
              <div className="p-2 bg-zinc-900 rounded-lg text-white">
                <Stethoscope className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-base font-bold font-display text-zinc-900 tracking-tight">
                GodsCareHospital
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Our mission is to deliver comprehensive, high-quality healthcare services with compassion, expertise, and a commitment to green medical sustainability.
            </p>
            <div className="flex space-x-2 text-zinc-400 text-xs font-semibold items-center">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">24/7 ICU & Emergency Active</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-zinc-900 font-semibold font-display text-xs tracking-wider uppercase mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => setCurrentView("home")}
                  className="hover:text-zinc-900 transition-colors text-zinc-500 cursor-pointer text-left"
                >
                  Home Page
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView("departments")}
                  className="hover:text-zinc-900 transition-colors text-zinc-500 cursor-pointer text-left"
                >
                  Medical Departments
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView("doctors")}
                  className="hover:text-zinc-900 transition-colors text-zinc-500 cursor-pointer text-left"
                >
                  Our Specialists
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView("auth")}
                  className="hover:text-zinc-900 transition-colors text-zinc-500 cursor-pointer text-left"
                >
                  Patient Portal Login
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3.5">
            <h3 className="text-zinc-900 font-semibold font-display text-xs tracking-wider uppercase mb-4">Contact Info</h3>
            <div className="flex items-start space-x-2 text-xs text-zinc-500">
              <Phone className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-zinc-800">Call Center</p>
                <p className="hover:text-zinc-900 cursor-pointer">09037457567</p>
                <p className="text-[10px] text-zinc-400 font-medium font-mono">Emergency Support Active</p>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs text-zinc-500">
              <Mail className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-zinc-800">Email Address</p>
                <p className="hover:text-zinc-900 cursor-pointer">austineisama150@gmail.com</p>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs text-zinc-500">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                450 Emerald Blvd, Wellness District, Seattle, WA 98101
              </p>
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <h3 className="text-zinc-900 font-semibold font-display text-xs tracking-wider uppercase mb-4">Working Hours</h3>
            <ul className="space-y-3 text-xs text-zinc-500">
              <li className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5 text-zinc-400" /> Outpatient Clinic</span>
                <span className="font-medium text-zinc-800">8 AM - 6 PM</span>
              </li>
              <li className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                <span>Saturday Sessions</span>
                <span className="font-medium text-zinc-800">9 AM - 2 PM</span>
              </li>
              <li className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                <span>Sunday</span>
                <span className="text-zinc-400 font-semibold font-mono uppercase text-[10px] tracking-wider">Closed</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Emergency ICU</span>
                <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase border border-zinc-200">24 Hours</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lower footer */}
      <div className="bg-zinc-50 border-t border-zinc-100 py-6">
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
