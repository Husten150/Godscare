import React from "react";
import { 
  HeartPulse, 
  Brain, 
  Activity, 
  Sparkles, 
  Stethoscope, 
  Search, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck 
} from "lucide-react";

interface DepartmentsProps {
  onSelectDepartment: (deptName: string) => void;
  themeMode?: "light" | "dark";
}

interface DepartmentData {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  conditions: string[];
  services: string[];
  color: string;
}

export default function Departments({ onSelectDepartment, themeMode = "light" }: DepartmentsProps) {
  const isDark = themeMode === "dark";
  const [searchQuery, setSearchQuery] = React.useState("");

  const departmentsData: DepartmentData[] = [
    {
      id: "cardio",
      name: "Cardiology",
      description: "Comprehensive cardiac screening, disease prevention, and cutting-edge vascular care.",
      longDescription: "Our state-of-the-art Cardiology Wing houses advanced diagnostics for heart valve therapy, coronary interventions, and preventative cardiovascular health plans. We emphasize sustainable medicine, using non-invasive screenings wherever possible.",
      icon: <HeartPulse className="h-5 w-5 text-zinc-800" />,
      conditions: ["Coronary artery disease", "Arrhythmias", "Hypertension", "Heart valve disease"],
      services: ["Electrocardiograms (ECG)", "Vascular ultrasounds", "Stress testing", "Holter monitoring"],
      color: "border-zinc-200/85 bg-white"
    },
    {
      id: "peds",
      name: "Pediatrics",
      description: "Specialized clinical attention and immunizations supporting children's growth from birth.",
      longDescription: "The Pediatrics division offers a vibrant, friendly atmosphere designed to ease children's anxiety. From routine pediatric wellness visits to growth monitoring, our board-certified clinicians are dedicated to child health.",
      icon: <ShieldCheck className="h-5 w-5 text-zinc-800" />,
      conditions: ["Childhood allergies", "Developmental delays", "Asthma and cold protocols", "Nutritional deficiencies"],
      services: ["Newborn care assessments", "Routine immunizations", "Behavioral counseling", "School physical examinations"],
      color: "border-zinc-200/85 bg-white"
    },
    {
      id: "neuro",
      name: "Neurology",
      description: "Expert therapeutic evaluation of brain, peripheral nerves, and spine disorders.",
      longDescription: "Our neurology specialists utilize highly refined, energy-efficient neuroimaging technologies to evaluate complex nerve, spine, and brain conditions, offering custom cognitive rehabilitation protocols.",
      icon: <Brain className="h-5 w-5 text-zinc-800" />,
      conditions: ["Chronic migraines", "Epilepsy and seizures", "Parkinson's and tremors", "Sleep disorders"],
      services: ["Electroencephalography (EEG)", "Neuromuscular testing", "Memory and cognitive screens", "Sleep apnea audits"],
      color: "border-zinc-200/85 bg-white"
    },
    {
      id: "ortho",
      name: "Orthopedics",
      description: "Advanced skeletal, muscular joint replacement, and specialized sports rehabilitation.",
      longDescription: "From minimally invasive arthroscopy to full joint reconstructions, our Orthopedics unit restores alignment and mobility. We offer eco-friendly physical therapy and natural athletic rehab programs.",
      icon: <Activity className="h-5 w-5 text-zinc-800" />,
      conditions: ["Joint fractures", "Osteoarthritis", "ACL and sports tears", "Spine alignment issues"],
      services: ["Joint replacement surgeries", "Minimally invasive arthroscopy", "Clinical sports physical therapy", "Skeletal alignment screening"],
      color: "border-zinc-200/85 bg-white"
    },
    {
      id: "derm",
      name: "Dermatology",
      description: "Providing advanced skincare, medical dermatology, and cosmetic procedures.",
      longDescription: "A clinic dedicated to the health, protection, and appearance of your skin. Our board-certified dermatologists focus on early detection of skin cancers, eczema management, and advanced acne relief.",
      icon: <Sparkles className="h-5 w-5 text-zinc-800" />,
      conditions: ["Acne and rosacea", "Eczema and psoriasis", "Skin cancer screening", "Atopic dermatitis"],
      services: ["Full-body mole mapping", "Cryotherapy lesions treatment", "Skincare regime formulation", "Allergy patch testing"],
      color: "border-zinc-200/85 bg-white"
    },
    {
      id: "general",
      name: "General Medicine",
      description: "Comprehensive family medicine, wellness reviews, and chronic condition maintenance.",
      longDescription: "Our family physicians serve as the patient's primary advocate, providing exhaustive annual checkups, diabetes maintenance, high-cholesterol planning, and preventive care counseling.",
      icon: <Stethoscope className="h-5 w-5 text-zinc-800" />,
      conditions: ["Type 2 Diabetes", "High Cholesterol", "Chronic Fatigue", "General seasonal infections"],
      services: ["Comprehensive wellness physicals", "Blood panel diagnostics", "Vaccination boosters", "Chronic symptom planning"],
      color: "border-zinc-200/85 bg-white"
    }
  ];

  const filteredDepts = departmentsData.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.conditions.some(cond => cond.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`py-12 font-sans transition-colors duration-300 ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-[#fbfbfc] text-zinc-800"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <span className="text-emerald-500 font-mono font-bold text-[10px] uppercase tracking-widest block">Clinical Wings</span>
            <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>Medical Departments</h1>
            <p className={`max-w-xl text-xs md:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Explore our world-class medical departments, find specialized care treatments, and connect directly with expert physicians.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by wing or symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-hidden transition-all placeholder:text-zinc-400 ${
                isDark 
                  ? "bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500/50" 
                  : "bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400"
              }`}
              id="dept-search-input"
            />
          </div>
        </div>

        {/* Grid List */}
        {filteredDepts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredDepts.map((dept) => (
              <div 
                key={dept.id}
                className={`border rounded-2xl p-6 md:p-8 transition-all hover:shadow-md flex flex-col justify-between ${
                  isDark 
                    ? "bg-zinc-900/90 border-zinc-800/90 text-zinc-200" 
                    : "bg-white border-zinc-200/85 text-zinc-800"
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl border ${isDark ? "bg-zinc-800/80 border-zinc-700 text-emerald-400" : "bg-zinc-50 border-zinc-100 text-zinc-800"}`}>
                      {dept.icon}
                    </div>
                    <span className={`text-[9px] font-mono font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      isDark 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}>
                      Primary Wing
                    </span>
                  </div>

                  {/* Descriptions */}
                  <h3 className={`text-xl font-bold mb-1.5 font-display ${isDark ? "text-white" : "text-zinc-900"}`}>{dept.name}</h3>
                  <p className={`text-xs md:text-sm font-semibold mb-3 leading-relaxed ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                    {dept.description}
                  </p>
                  <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    {dept.longDescription}
                  </p>

                  {/* Treatment bullets split */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    {/* Conditions Treated */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">Commonly Treated</h4>
                      <ul className={`space-y-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                        {dept.conditions.map((cond, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="h-1 w-1 bg-emerald-500 rounded-full shrink-0"></span>
                            <span>{cond}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Services Offered */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">Our Services</h4>
                      <ul className={`space-y-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                        {dept.services.map((srv, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="h-1 w-1 bg-emerald-500 rounded-full shrink-0"></span>
                            <span>{srv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Direct CTA */}
                <div className={`border-t pt-5 mt-auto ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                  <button
                    onClick={() => onSelectDepartment(dept.name)}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      isDark 
                        ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold" 
                        : "bg-zinc-900 hover:bg-zinc-800 text-white"
                    }`}
                  >
                    <span>View Specialists & Schedule</span>
                    <ArrowRight className={`h-3.5 w-3.5 ${isDark ? "text-zinc-950" : "text-emerald-400"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-12 rounded-2xl border max-w-xl mx-auto space-y-4 ${
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200/60"
          }`}>
            <p className="text-zinc-400 text-xs font-medium">No medical departments matched your search term.</p>
            <button
              onClick={() => setSearchQuery("")}
              className={`text-xs font-semibold hover:underline cursor-pointer ${isDark ? "text-emerald-400" : "text-zinc-900"}`}
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
