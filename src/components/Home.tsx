import React from "react";
import { getApiUrl } from "../config";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  HeartPulse, 
  Activity, 
  Users, 
  Clock, 
  ChevronRight, 
  ShieldCheck, 
  Award, 
  CalendarRange, 
  FileHeart, 
  ArrowRight,
  Sparkles,
  LogIn,
  Lock,
  Pill,
  CreditCard
} from "lucide-react";
import { getRoutePath } from "../routes";

interface HomeProps {
  setCurrentView: (view: string) => void;
  userLoggedIn: boolean;
  themeMode?: "light" | "dark";
  onToggleTheme?: () => void;
}

export default function Home({ setCurrentView, userLoggedIn, themeMode = "light", onToggleTheme }: HomeProps) {
  const isDark = themeMode === "dark";

  const stats = [
    { icon: <Users className={`h-5 w-5 ${isDark ? "text-emerald-400" : "text-zinc-800"}`} />, value: "15,000+", label: "Patients Healed" },
    { icon: <Award className={`h-5 w-5 ${isDark ? "text-emerald-400" : "text-zinc-800"}`} />, value: "99.4%", label: "Clinical Success" },
    { icon: <HeartPulse className={`h-5 w-5 ${isDark ? "text-emerald-400" : "text-zinc-800"}`} />, value: "12+", label: "Specialties" },
    { icon: <Clock className={`h-5 w-5 ${isDark ? "text-emerald-400" : "text-zinc-800"}`} />, value: "24/7", label: "Emergency Presence" },
  ];

  const features = [
    {
      title: "Sustainable Healthcare",
      description: "We lead the industry in green clinical operations, minimizing hospital waste, and running on 100% renewable energy.",
      icon: <Sparkles className="h-4 w-4" />
    },
    {
      title: "Board-Certified Specialists",
      description: "Our roster features world-renowned clinicians holding degrees from top institutions like Stanford, Harvard, and Yale.",
      icon: <Award className="h-4 w-4" />
    },
    {
      title: "Patient-First Technology",
      description: "Book, track, and manage your appointments and diagnostic reports from our seamless secure cloud portal.",
      icon: <ShieldCheck className="h-4 w-4" />
    }
  ];

  const previewDepartments = [
    {
      name: "Cardiology",
      description: "Comprehensive cardiac screening, disease prevention, and cutting-edge vascular care.",
      tagline: "Healthy Hearts"
    },
    {
      name: "Pediatrics",
      description: "Specialized clinical attention and immunizations supporting children's growth from birth.",
      tagline: "Happy Children"
    },
    {
      name: "Neurology",
      description: "Expert therapeutic evaluation of brain, peripheral nerves, and spine disorders.",
      tagline: "Brain & Spine Care"
    },
    {
      name: "Orthopedics",
      description: "Advanced skeletal, muscular joint replacement, and specialized sports rehabilitation.",
      tagline: "Skeletal Health"
    }
  ];

  const testimonials = [
    {
      quote: "The patient portal is incredibly fast and secure. Booking an appointment with Dr. Vance took less than two minutes, and I was able to download my diagnostics report directly from my dashboard.",
      author: "Robert Miller",
      role: "Cardiology Patient",
      rating: 5
    },
    {
      quote: "As a busy mother, managing appointments was always stressful. GodsCare Pediatrics department has been amazing. The medical dashboard allows me to see past records and book reminders instantly.",
      author: "Sophia Alvarez",
      role: "Mother of 2",
      rating: 5
    }
  ];

  const portalCapabilities = [
    {
      title: "Online Appointments",
      description: "Schedule, reschedule, or review upcoming specialist consultations across all 6 clinical wings.",
      icon: <CalendarRange className="h-4 w-4" />
    },
    {
      title: "Diagnostic Vault",
      description: "Download encrypted lab panels, imaging summaries, and physician notes immediately after review.",
      icon: <FileHeart className="h-4 w-4" />
    },
    {
      title: "E-Prescriptions",
      description: "Check active medication instructions, dosage histories, and hospital pharmacy fulfillment status.",
      icon: <Pill className="h-4 w-4" />
    },
    {
      title: "Billing & Invoices",
      description: "Inspect itemized clinical statements and complete secure online payments without front-desk queues.",
      icon: <CreditCard className="h-4 w-4" />
    }
  ];

  return (
    <div className={`font-sans transition-colors duration-300 ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-[#fbfbfc] text-zinc-800"}`}>
      {/* Hero Section */}
      <section className={`relative overflow-hidden py-16 lg:py-24 border-b transition-colors ${
        isDark ? "bg-zinc-900/90 text-white border-zinc-800" : "bg-white text-zinc-900 border-zinc-100"
      }`}>
        {/* Subtle grid pattern for minimal elegance */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100/80 text-emerald-800"
              }`}>
                <HeartPulse className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span>Next-Gen Sustainable Medicine</span>
              </div>
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight leading-none ${isDark ? "text-white" : "text-zinc-900"}`}>
                Where Clinical Care Meets <span className="text-emerald-500">Green Excellence</span>
              </h1>
              <p className={`text-xs sm:text-sm leading-relaxed max-w-xl font-sans ${isDark ? "text-zinc-300" : "text-zinc-500"}`}>
                Experience world-class, board-certified medicine in our highly sustainable, award-winning healing environments. Book appointments and manage diagnostics online.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={getRoutePath(userLoggedIn ? "dashboard" : "auth")}
                  className={`px-5 py-3 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all text-center flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                    isDark ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                  id="hero-book-appointment"
                >
                  <CalendarRange className={`h-4 w-4 ${isDark ? "text-zinc-950" : "text-emerald-400"}`} />
                  <span>Book Appointment Online</span>
                </a>
                <a
                  href={getRoutePath("departments")}
                  className={`px-5 py-3 border rounded-lg text-xs font-semibold tracking-wide uppercase transition-all text-center flex items-center justify-center space-x-1 cursor-pointer ${
                    isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700" : "bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200"
                  }`}
                  id="hero-explore-departments"
                >
                  <span>Explore Specialties</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Right Column Visual Portal Card */}
            <div className="lg:col-span-5">
              <div className={`rounded-2xl p-6 md:p-8 border shadow-lg relative ${
                isDark ? "bg-zinc-900/90 border-zinc-800 text-white" : "bg-white border-zinc-200/80 text-zinc-900"
              }`}>
                {/* Visual accent */}
                <div className="absolute -top-3 -right-3 h-10 w-10 bg-emerald-500 rounded-lg flex items-center justify-center text-zinc-950 shadow-md">
                  <Activity className="h-5 w-5" />
                </div>
                
                <h3 className={`text-base font-bold font-display mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Patient Virtual Hub</h3>
                <p className={`text-xs mb-6 leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Skip the telephone queue. Register or login to enjoy absolute agency over your healing journey.
                </p>
                
                <div className="space-y-3">
                  <a 
                    href={getRoutePath(userLoggedIn ? "dashboard" : "auth")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isDark ? "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30" : "bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200"
                    }`}
                    id="hero-patient-portal-link"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-emerald-400"}`}>
                        <LogIn className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                          {userLoggedIn ? "Open Patient Portal Dashboard" : "Patient Portal Sign In"}
                        </p>
                        <p className={`text-[10px] font-mono ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>
                          {userLoggedIn ? "MANAGE VISITS & LAB RECORDS" : "SIGN IN OR CREATE PATIENT ACCOUNT"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className={`h-3.5 w-3.5 transition-colors ${isDark ? "text-emerald-400" : "text-emerald-700"}`} />
                  </a>

                  <a 
                    href={getRoutePath("departments")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isDark ? "bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/80" : "bg-zinc-50 hover:bg-zinc-100/50 border-zinc-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                        <HeartPulse className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>Browse Departments</p>
                        <p className="text-[10px] text-zinc-400 font-mono">6 SPECIALIZED MEDICAL WINGS</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  </a>

                  <a 
                    href={getRoutePath("doctors")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isDark ? "bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/80" : "bg-zinc-50 hover:bg-zinc-100/50 border-zinc-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-zinc-700 text-zinc-200" : "bg-zinc-100 text-zinc-700"}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>View Doctor Roster</p>
                        <p className="text-[10px] text-zinc-400 font-mono">CHECK LIVE BIOS & RATINGS</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  </a>

                  <a 
                    href={getRoutePath(userLoggedIn ? "dashboard" : "auth")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isDark ? "bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/80" : "bg-zinc-50 hover:bg-zinc-100/50 border-zinc-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                        <FileHeart className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>Access Reports & History</p>
                        <p className="text-[10px] text-zinc-400 font-mono">SECURE ENCRYPTED VAULT</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-12 border-b ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-4 p-4">
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-100"}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-black tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>{stat.value}</p>
                  <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dedicated Patient Portal Access Section */}
      <section
        id="patient-portal"
        className={`py-16 md:py-20 border-b transition-colors ${
          isDark ? "bg-zinc-900/40 border-zinc-800 text-zinc-100" : "bg-zinc-50/70 border-zinc-100 text-zinc-900"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Patient Portal · 24/7 Encrypted Access</span>
              </div>
              <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight font-display [text-wrap:balance] ${
                isDark ? "text-white" : "text-zinc-900"
              }`}>
                Your Clinical Records & Visits in One Place
              </h2>
              <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                Sign in to the GodsCare Patient Portal to book specialist consultations, download verified diagnostic reports, review active prescriptions, and manage medical invoices from any device.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={getRoutePath(userLoggedIn ? "dashboard" : "auth")}
                  id="home-patient-portal-cta"
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isDark
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>{userLoggedIn ? "Go to Patient Portal" : "Enter Patient Portal"}</span>
                </a>
                {!userLoggedIn && (
                  <a
                    href={getRoutePath("doctors")}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isDark
                        ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                        : "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    <span>Browse Specialists</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </a>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {portalCapabilities.map((item) => (
                <a
                  key={item.title}
                  href={getRoutePath(userLoggedIn ? "dashboard" : "auth")}
                  className={`rounded-2xl p-6 border transition-colors flex flex-col justify-between gap-4 cursor-pointer group ${
                    isDark
                      ? "bg-zinc-900/90 border-zinc-800 hover:border-emerald-500/40"
                      : "bg-white border-zinc-200/80 hover:border-zinc-300"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className={`inline-flex p-2 rounded-lg ${
                      isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {item.icon}
                    </div>
                    <h3 className={`text-base font-bold font-display ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {item.title}
                    </h3>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      {item.description}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    isDark ? "text-emerald-400" : "text-zinc-800"
                  }`}>
                    <span>{userLoggedIn ? "Open Dashboard" : "Access via Portal"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Specialties / Departments Preview */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <p className="text-emerald-500 font-mono font-bold text-[10px] uppercase tracking-widest">Medical Departments</p>
          <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>Pillars of Clinical Excellence</h2>
          <p className={`max-w-xl mx-auto text-xs md:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            From pediatric immunizations to complex vascular surgeries, we host advanced specialized medical units.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewDepartments.map((dept, idx) => (
            <div 
              key={idx}
              className={`rounded-2xl p-6 transition-all hover:-translate-y-0.5 border flex flex-col justify-between ${
                isDark 
                  ? "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700" 
                  : "bg-white border-zinc-200/60 hover:border-zinc-300 shadow-xs"
              }`}
            >
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider mb-4 font-semibold border ${
                  isDark ? "bg-zinc-800 text-emerald-400 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}>
                  {dept.tagline}
                </span>
                <h3 className={`text-lg font-bold mb-2 font-display ${isDark ? "text-white" : "text-zinc-900"}`}>{dept.name}</h3>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{dept.description}</p>
              </div>
              <a 
                href={getRoutePath("doctors", { department: dept.name })}
                className={`text-xs font-semibold flex items-center space-x-1 cursor-pointer group mt-auto align-bottom ${
                  isDark ? "text-emerald-400 hover:text-emerald-300" : "text-zinc-800 hover:text-zinc-900"
                }`}
              >
                <span>View Specialist Schedules</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href={getRoutePath("departments")}
            className={`inline-flex items-center space-x-1.5 px-5 py-2.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isDark 
                ? "bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800" 
                : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800"
            }`}
          >
            <span>See All 6 Clinical Wings</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* Sustainable Features Banner */}
      <section className={`py-16 border-y overflow-hidden relative ${
        isDark ? "bg-zinc-900/60 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-100 text-zinc-900"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-4 space-y-4">
              <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest block">The Green Standard</span>
              <h2 className={`text-3xl font-extrabold tracking-tight leading-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>Healing Patients & Saving Our Planet</h2>
              <p className={`text-xs leading-relaxed font-sans ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                We believe that health is linked to the environment. GodsCare Hospital represents a clinical pivot toward restorative, clean, carbon-neutral healthcare.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feat, index) => (
                <div key={index} className={`rounded-2xl p-6 space-y-3 border transition-all ${
                  isDark ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-200/80 hover:border-zinc-300"
                }`}>
                  <div className={`p-2 rounded-lg inline-block ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-100 text-zinc-700"}`}>
                    {feat.icon}
                  </div>
                  <h4 className={`text-sm font-bold font-display ${isDark ? "text-white" : "text-zinc-900"}`}>{feat.title}</h4>
                  <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-12">
          <p className="text-zinc-400 font-mono font-bold text-[10px] uppercase tracking-widest">Patient Reviews</p>
          <h2 className={`text-3xl font-bold tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>Stories of Healing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((test, index) => (
            <div key={index} className={`rounded-2xl p-6 md:p-8 space-y-4 border ${
              isDark ? "bg-zinc-900/80 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200/60 shadow-xs text-zinc-900"
            }`}>
              <div className="flex space-x-1 text-amber-400">
                {Array.from({ length: test.rating }).map((_, i) => (
                  <span key={i} className="text-sm">★</span>
                ))}
              </div>
              <p className={`text-xs md:text-sm italic leading-relaxed ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                "{test.quote}"
              </p>
              <div className={`border-t pt-4 flex justify-between items-center ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                <div>
                  <h5 className={`font-bold text-xs md:text-sm font-display ${isDark ? "text-white" : "text-zinc-900"}`}>{test.author}</h5>
                  <p className="text-[10px] text-zinc-400 font-mono uppercase">{test.role}</p>
                </div>
                <span className={`text-[9px] font-mono font-semibold px-2.5 py-0.5 rounded-full border uppercase ${
                  isDark ? "bg-zinc-800 text-emerald-400 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}>
                  Verified Patient
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact & Real-Time Feedback Section */}
      <section className={`py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
        <div className="text-center space-y-3 mb-10">
          <p className="text-emerald-500 font-mono font-bold text-[10px] uppercase tracking-widest">Connect with us</p>
          <h2 className={`text-3xl font-extrabold tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>Real-Time Client Feedback</h2>
          <p className={`max-w-md mx-auto text-xs md:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Have thoughts, questions, or issues? Share your feedback in real-time. It is immediately routed to our administration at <strong className={isDark ? "text-zinc-200" : "text-zinc-800"}>austineisama150@gmail.com</strong>.
          </p>
        </div>

        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const target = e.currentTarget;
            const formData = new FormData(target);
            const name = formData.get("name") as string;
            const email = formData.get("email") as string;
            const subject = formData.get("subject") as string;
            const message = formData.get("message") as string;

            if (!name || !email || !message) {
              alert("Please fill in all required fields (Name, Email, Message).");
              return;
            }

            try {
              const res = await fetch(getApiUrl("/api/feedback"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, subject, message })
              });

              if (res.ok) {
                const data = await res.json();
                alert(data.message || "Feedback submitted successfully!");
                target.reset();
              } else {
                const error = await res.text();
                throw new Error(error || "Server responded with error");
              }
            } catch (err: any) {
              console.warn("Feedback server unreachable, logging directly to Firestore:", err);
              try {
                const feedbackId = `fb-${Date.now()}`;
                const feedbackData = {
                  id: feedbackId,
                  name,
                  email,
                  subject: subject || "General Client Feedback",
                  message,
                  submittedAt: new Date().toISOString()
                };

                await setDoc(doc(db, "feedbacks", feedbackId), feedbackData);
                alert("Your feedback has been logged securely in our clinical vault!");
                target.reset();
              } catch (fallbackErr: any) {
                console.error("Direct Firestore feedback fallback failed:", fallbackErr);
                alert(`Error: ${fallbackErr.message || "Unable to reach feedback server."}`);
              }
            }
          }}
          className={`space-y-6 rounded-2xl p-6 md:p-8 border ${
            isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200/80 text-zinc-900 shadow-xs"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`block text-xs font-mono font-bold uppercase ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Your Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                required
                placeholder="John Doe"
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-sans focus:outline-hidden border ${
                  isDark ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500" : "bg-white border-zinc-200 text-zinc-900"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className={`block text-xs font-mono font-bold uppercase ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-sans focus:outline-hidden border ${
                  isDark ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500" : "bg-white border-zinc-200 text-zinc-900"
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`block text-xs font-mono font-bold uppercase ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Subject (Optional)</label>
            <input
              type="text"
              name="subject"
              placeholder="e.g. Appointment Feedback, Portal Suggestion"
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-sans focus:outline-hidden border ${
                isDark ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500" : "bg-white border-zinc-200 text-zinc-900"
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className={`block text-xs font-mono font-bold uppercase ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Message / Feedback <span className="text-red-500">*</span></label>
            <textarea
              name="message"
              required
              rows={4}
              placeholder="Tell us about your experience..."
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-sans focus:outline-hidden border resize-none ${
                isDark ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500" : "bg-white border-zinc-200 text-zinc-900"
              }`}
            ></textarea>
          </div>

          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
              isDark ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950" : "bg-zinc-900 hover:bg-zinc-800 text-white"
            }`}
          >
            Send Real-Time Feedback to Administration
          </button>
        </form>
      </section>
    </div>
  );
}

