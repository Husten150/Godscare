import React from "react";
import { getApiUrl } from "../config";
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
  Sparkles
} from "lucide-react";

interface HomeProps {
  setCurrentView: (view: string) => void;
  userLoggedIn: boolean;
}

export default function Home({ setCurrentView, userLoggedIn }: HomeProps) {
  const stats = [
    { icon: <Users className="h-5 w-5 text-zinc-800" />, value: "15,000+", label: "Patients Healed" },
    { icon: <Award className="h-5 w-5 text-zinc-800" />, value: "99.4%", label: "Clinical Success" },
    { icon: <HeartPulse className="h-5 w-5 text-zinc-800" />, value: "12+", label: "Specialties" },
    { icon: <Clock className="h-5 w-5 text-zinc-800" />, value: "24/7", label: "Emergency Presence" },
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
      color: "bg-white",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
      tagline: "Healthy Hearts"
    },
    {
      name: "Pediatrics",
      description: "Specialized clinical attention and immunizations supporting children's growth from birth.",
      color: "bg-white",
      accent: "text-zinc-700 bg-zinc-100 border-zinc-200",
      tagline: "Happy Children"
    },
    {
      name: "Neurology",
      description: "Expert therapeutic evaluation of brain, peripheral nerves, and spine disorders.",
      color: "bg-white",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
      tagline: "Brain & Spine Care"
    },
    {
      name: "Orthopedics",
      description: "Advanced skeletal, muscular joint replacement, and specialized sports rehabilitation.",
      color: "bg-white",
      accent: "text-zinc-700 bg-zinc-100 border-zinc-200",
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
      quote: "As a busy mother, managing appointments was always stressful. GreenCare's Pediatrics department has been amazing. The medical dashboard allows me to see past records and book reminders instantly.",
      author: "Sophia Alvarez",
      role: "Mother of 2",
      rating: 5
    }
  ];

  return (
    <div className="font-sans text-zinc-800 bg-[#fbfbfc]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white text-zinc-900 py-16 lg:py-24 border-b border-zinc-100">
        {/* Subtle grid pattern for minimal elegance */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-100/80 px-3 py-1.5 rounded-full text-emerald-800 text-[10px] font-mono uppercase tracking-wider">
                <HeartPulse className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                <span>Next-Gen Sustainable Medicine</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight leading-none text-zinc-900">
                Where Clinical Care Meets <span className="text-emerald-600">Green Excellence</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-xl font-sans">
                Experience world-class, board-certified medicine in our highly sustainable, award-winning healing environments. Book appointments and manage diagnostics online.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setCurrentView(userLoggedIn ? "dashboard" : "auth")}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold tracking-wide uppercase transition-all text-center flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                  id="hero-book-appointment"
                >
                  <CalendarRange className="h-4 w-4 text-emerald-400" />
                  <span>Book Appointment Online</span>
                </button>
                <button
                  onClick={() => setCurrentView("departments")}
                  className="px-5 py-3 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all text-center flex items-center justify-center space-x-1 cursor-pointer"
                  id="hero-explore-departments"
                >
                  <span>Explore Specialties</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column Visual Portal Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl p-6 md:p-8 border border-zinc-200/80 shadow-xs relative">
                {/* Visual accent */}
                <div className="absolute -top-3 -right-3 h-10 w-10 bg-zinc-900 rounded-lg flex items-center justify-center text-emerald-400 shadow-md">
                  <Activity className="h-5 w-5" />
                </div>
                
                <h3 className="text-base font-bold font-display text-zinc-900 mb-2">Patient Virtual Hub</h3>
                <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                  Skip the telephone queue. Register or login to enjoy absolute agency over your healing journey.
                </p>
                
                <div className="space-y-3">
                  <div 
                    onClick={() => setCurrentView("departments")}
                    className="flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100/50 rounded-lg border border-zinc-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                        <HeartPulse className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-zinc-800">Browse Departments</p>
                        <p className="text-[10px] text-zinc-400 font-mono">6 SPECIALIZED MEDICAL WINGS</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                  </div>

                  <div 
                    onClick={() => setCurrentView("doctors")}
                    className="flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100/50 rounded-lg border border-zinc-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-zinc-100 rounded-lg text-zinc-700">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-zinc-800">View Doctor Roster</p>
                        <p className="text-[10px] text-zinc-400 font-mono">CHECK LIVE BIOS & RATINGS</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                  </div>

                  <div 
                    onClick={() => setCurrentView(userLoggedIn ? "dashboard" : "auth")}
                    className="flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100/50 rounded-lg border border-zinc-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                        <FileHeart className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-zinc-800">Access Reports & History</p>
                        <p className="text-[10px] text-zinc-400 font-mono">SECURE ENCRYPTED VAULT</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-4 p-4">
                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900 tracking-tight font-display">{stat.value}</p>
                  <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Specialties / Departments Preview */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <p className="text-emerald-700 font-mono font-bold text-[10px] uppercase tracking-widest">Medical Departments</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight font-display">Pillars of Clinical Excellence</h2>
          <p className="text-zinc-500 max-w-xl mx-auto text-xs md:text-sm">
            From pediatric immunizations to complex vascular surgeries, we host advanced specialized medical units.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewDepartments.map((dept, idx) => (
            <div 
              key={idx}
              className="bg-white border border-zinc-200/60 hover:border-zinc-300 rounded-xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider mb-4 font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200">
                  {dept.tagline}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 mb-2 font-display">{dept.name}</h3>
                <p className="text-zinc-500 text-xs leading-relaxed mb-6">{dept.description}</p>
              </div>
              <button 
                onClick={() => setCurrentView("departments")}
                className="text-zinc-800 hover:text-zinc-900 text-xs font-semibold flex items-center space-x-1 cursor-pointer group mt-auto align-bottom"
              >
                <span>View Specialist Schedules</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => setCurrentView("departments")}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <span>See All 6 Clinical Wings</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* Sustainable Features Banner */}
      <section className="bg-zinc-50 border-y border-zinc-100 py-16 text-zinc-900 overflow-hidden relative">
        <div className="absolute inset-0 opacity-2 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-4 space-y-4">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">The Green Standard</span>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight font-display">Healing Patients & Saving Our Planet</h2>
              <p className="text-zinc-500 text-xs leading-relaxed font-sans">
                We believe that health is linked to the environment. GreenCare represents a clinical pivot toward restorative, clean, carbon-neutral healthcare.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feat, index) => (
                <div key={index} className="bg-white border border-zinc-200/80 rounded-xl p-6 space-y-3 hover:border-zinc-300 transition-all">
                  <div className="p-2 bg-zinc-100 text-zinc-700 rounded-lg inline-block">
                    {feat.icon}
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 font-display">{feat.title}</h4>
                  <p className="text-zinc-500 text-xs leading-relaxed">{feat.description}</p>
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
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight font-display">Stories of Healing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((test, index) => (
            <div key={index} className="bg-white border border-zinc-200/60 shadow-xs rounded-xl p-6 md:p-8 space-y-4">
              <div className="flex space-x-1 text-amber-500">
                {Array.from({ length: test.rating }).map((_, i) => (
                  <span key={i} className="text-sm">★</span>
                ))}
              </div>
              <p className="text-zinc-600 text-xs md:text-sm italic leading-relaxed">
                "{test.quote}"
              </p>
              <div className="border-t border-zinc-100 pt-4 flex justify-between items-center">
                <div>
                  <h5 className="font-bold text-zinc-900 text-xs md:text-sm font-display">{test.author}</h5>
                  <p className="text-[10px] text-zinc-400 font-mono uppercase">{test.role}</p>
                </div>
                <span className="text-[9px] font-mono font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200 uppercase">
                  Verified Patient
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact & Real-Time Feedback Section */}
      <section className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-100">
        <div className="text-center space-y-3 mb-10">
          <p className="text-emerald-700 font-mono font-bold text-[10px] uppercase tracking-widest">Connect with us</p>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight font-display">Real-Time Client Feedback</h2>
          <p className="text-zinc-500 max-w-md mx-auto text-xs md:text-sm">
            Have thoughts, questions, or issues? Share your feedback in real-time. It is immediately routed to our administration at <strong className="text-zinc-800">austineisama150@gmail.com</strong>.
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
                alert(`Submission failed: ${error}`);
              }
            } catch (err: any) {
              alert(`Error: ${err.message || "Unable to reach feedback server."}`);
            }
          }}
          className="space-y-6 bg-white border border-zinc-200/80 rounded-2xl p-6 md:p-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase text-zinc-500">Your Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                required
                placeholder="John Doe"
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase text-zinc-500">Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-zinc-500">Subject (Optional)</label>
            <input
              type="text"
              name="subject"
              placeholder="e.g. Appointment Feedback, Portal Suggestion"
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-zinc-500">Message / Feedback <span className="text-red-500">*</span></label>
            <textarea
              name="message"
              required
              rows={4}
              placeholder="Tell us about your experience..."
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
          >
            Send Real-Time Feedback to Administration
          </button>
        </form>
      </section>
    </div>
  );
}
