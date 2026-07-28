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

export default function Departments({ onSelectDepartment }: DepartmentsProps) {
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
    <div className="py-12 bg-[#fbfbfc] font-sans text-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <span className="text-zinc-400 font-mono font-bold text-[10px] uppercase tracking-widest block">Clinical Wings</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight font-display">Medical Departments</h1>
            <p className="text-zinc-500 max-w-xl text-xs md:text-sm">
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
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 transition-all placeholder:text-zinc-400"
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
                className={`border rounded-xl p-6 md:p-8 transition-all hover:shadow-xs flex flex-col justify-between ${dept.color}`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                      {dept.icon}
                    </div>
                    <span className="text-[9px] font-mono font-semibold px-2.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full border border-zinc-200 uppercase tracking-wider">
                      Primary Wing
                    </span>
                  </div>

                  {/* Descriptions */}
                  <h3 className="text-xl font-bold text-zinc-900 mb-1.5 font-display">{dept.name}</h3>
                  <p className="text-zinc-800 text-xs md:text-sm font-semibold mb-3 leading-relaxed">
                    {dept.description}
                  </p>
                  <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                    {dept.longDescription}
                  </p>

                  {/* Treatment bullets split */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    {/* Conditions Treated */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Commonly Treated</h4>
                      <ul className="space-y-1.5 text-zinc-600 text-xs">
                        {dept.conditions.map((cond, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="h-1 w-1 bg-zinc-300 rounded-full shrink-0"></span>
                            <span>{cond}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Services Offered */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Our Services</h4>
                      <ul className="space-y-1.5 text-zinc-600 text-xs">
                        {dept.services.map((srv, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="h-1 w-1 bg-zinc-300 rounded-full shrink-0"></span>
                            <span>{srv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Direct CTA */}
                <div className="border-t border-zinc-100 pt-5 mt-auto">
                  <button
                    onClick={() => onSelectDepartment(dept.name)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>View Specialists & Schedule</span>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-zinc-200/60 max-w-xl mx-auto space-y-4">
            <p className="text-zinc-400 text-xs font-medium">No medical departments matched your search term.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-zinc-900 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
