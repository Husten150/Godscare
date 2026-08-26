import React from "react";
import { 
  collection, 
  getDocs 
} from "firebase/firestore";
import { db } from "../firebase";
import { Doctor } from "../types";
import { 
  Search, 
  Star, 
  Calendar, 
  Clock, 
  GraduationCap, 
  Stethoscope, 
  Briefcase,
  ChevronRight,
  UserCheck,
  Sparkles
} from "lucide-react";

interface DoctorsProps {
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  onBookDoctor: (doctor: Doctor) => void;
  themeMode?: "light" | "dark";
}

export default function Doctors({ selectedDepartment, setSelectedDepartment, onBookDoctor, themeMode = "light" }: DoctorsProps) {
  const isDark = themeMode === "dark";
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(null);

  // Load doctors dynamically from Firestore
  React.useEffect(() => {
    async function fetchDoctors() {
      try {
        setLoading(true);
        const colRef = collection(db, "doctors");
        const snapshot = await getDocs(colRef);
        const list: Doctor[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Doctor);
        });
        setDoctors(list);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDoctors();
  }, []);

  const departmentsList = [
    "All Departments",
    "Cardiology",
    "Pediatrics",
    "Neurology",
    "Orthopedics",
    "Dermatology",
    "General Medicine"
  ];

  // Filter doctors
  const filteredDoctors = doctors.filter((doc) => {
    const matchesDept = 
      selectedDepartment === "All Departments" || 
      selectedDepartment === "" ||
      doc.department.toLowerCase() === selectedDepartment.toLowerCase();

    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.bio.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDept && matchesSearch;
  });

  return (
    <div className={`py-12 font-sans transition-colors duration-300 ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-[#fbfbfc] text-zinc-800"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <span className="text-emerald-500 font-mono font-bold text-[10px] uppercase tracking-widest block">Medical Team</span>
            <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight font-display ${isDark ? "text-white" : "text-zinc-900"}`}>Our Specialists</h1>
            <p className={`max-w-xl text-xs md:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Connect with our world-renowned board-certified physicians, holding advanced clinical backgrounds.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by doctor, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-hidden transition-all placeholder:text-zinc-400 ${
                isDark 
                  ? "bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500/50" 
                  : "bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400"
              }`}
              id="doctor-search-input"
            />
          </div>
        </div>

        {/* Filter categories pills */}
        <div className={`flex flex-wrap gap-2 mb-10 border-b pb-6 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
          {departmentsList.map((dept, i) => {
            const isSelected = selectedDepartment === dept || (dept === "All Departments" && selectedDepartment === "");
            return (
              <button
                key={i}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                  isSelected
                    ? isDark ? "bg-emerald-500 text-zinc-950 border-emerald-500 font-bold" : "bg-zinc-900 text-white border-zinc-900"
                    : isDark ? "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
                }`}
              >
                {dept}
              </button>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className={`h-8 w-8 border-2 border-t-transparent rounded-full animate-spin ${isDark ? "border-emerald-400" : "border-zinc-900"}`}></div>
            <p className="text-zinc-400 text-xs font-medium">Loading specialist profiles...</p>
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDoctors.map((docProfile) => (
              <div 
                key={docProfile.id}
                className={`border rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group ${
                  isDark ? "bg-zinc-900/90 border-zinc-800/90 text-zinc-200" : "bg-white border-zinc-200/70 text-zinc-800"
                }`}
              >
                <div>
                  {/* Doctor Image Header */}
                  <div className={`relative h-60 overflow-hidden ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}>
                    <img 
                      src={docProfile.image} 
                      alt={docProfile.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                    />
                    {/* Specialty Tag floating */}
                    <span className="absolute bottom-3 left-3 bg-zinc-950/90 backdrop-blur-xs text-white text-[9px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-md border border-zinc-800">
                      {docProfile.specialty}
                    </span>
                    {/* Rating floating */}
                    <div className="absolute top-3 right-3 bg-zinc-950/90 text-amber-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md flex items-center space-x-1 border border-zinc-800 shadow-xs">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{docProfile.rating.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-[9px] uppercase font-mono font-semibold text-emerald-500 tracking-wider">
                        {docProfile.department} department
                      </span>
                      <h3 className={`text-lg font-bold group-hover:text-emerald-500 transition-colors font-display ${isDark ? "text-white" : "text-zinc-900"}`}>
                        {docProfile.name}
                      </h3>
                    </div>

                    <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      {docProfile.bio}
                    </p>

                    <div className={`space-y-2 border-t pt-4 text-xs ${isDark ? "border-zinc-800/80 text-zinc-300" : "border-zinc-100 text-zinc-600"}`}>
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs"><strong>Experience:</strong> {docProfile.experience}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate text-xs"><strong>Education:</strong> {docProfile.education}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className={`px-6 pb-6 pt-3 border-t flex items-center justify-between gap-3 ${
                  isDark ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-100 bg-zinc-50/50"
                }`}>
                  <button
                    onClick={() => setSelectedDoctor(docProfile)}
                    className={`text-xs font-bold cursor-pointer flex items-center space-x-0.5 ${
                      isDark ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"
                    }`}
                  >
                    <span>Full Bio</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => onBookDoctor(docProfile)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                      isDark ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                    }`}
                  >
                    <UserCheck className={`h-3.5 w-3.5 ${isDark ? "text-zinc-950" : "text-emerald-400"}`} />
                    <span>Book Schedule</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-16 rounded-2xl border max-w-xl mx-auto space-y-4 ${
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200/60"
          }`}>
            <p className="text-zinc-400 text-xs font-semibold">No doctor profile matched your selected criteria.</p>
            <button
              onClick={() => {
                setSelectedDepartment("All Departments");
                setSearchQuery("");
              }}
              className={`text-xs font-semibold hover:underline cursor-pointer ${isDark ? "text-emerald-400" : "text-zinc-900"}`}
            >
              Clear filters and search query
            </button>
          </div>
        )}

        {/* Doctor Bio Modal Popover */}
        {selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs">
            <div className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border ${
              isDark ? "bg-zinc-900 text-zinc-100 border-zinc-800" : "bg-white text-zinc-800 border-zinc-200"
            }`}>
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Modal Header */}
                <div className="flex justify-between items-start">
                  <div className="flex space-x-4">
                    <img 
                      src={selectedDoctor.image} 
                      alt={selectedDoctor.name} 
                      className={`h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover border ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
                    />
                    <div>
                      <span className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border tracking-wider ${
                        isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}>
                        {selectedDoctor.department} Specialist
                      </span>
                      <h3 className={`text-xl font-bold mt-1.5 font-display ${isDark ? "text-white" : "text-zinc-900"}`}>{selectedDoctor.name}</h3>
                      <p className={`text-xs font-medium font-sans ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{selectedDoctor.specialty}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDoctor(null)}
                    className={`p-1 rounded-lg transition-colors cursor-pointer text-sm font-semibold h-8 w-8 flex items-center justify-center ${
                      isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    ✕
                  </button>
                </div>

                {/* Star rating and quick items */}
                <div className={`flex flex-wrap items-center gap-4 p-3 rounded-xl border text-xs ${
                  isDark ? "bg-zinc-950/60 border-zinc-800 text-zinc-300" : "bg-zinc-50 border-zinc-100 text-zinc-600"
                }`}>
                  <div className="flex items-center space-x-1 font-semibold">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>{selectedDoctor.rating.toFixed(2)} Patient Satisfaction Rating</span>
                  </div>
                  <div className={`h-4 w-px ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}></div>
                  <div><strong>Experience:</strong> {selectedDoctor.experience}</div>
                </div>

                {/* Bio text */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">Professional Bio</h4>
                  <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    {selectedDoctor.bio}
                  </p>
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">Academic Background</h4>
                  <div className={`flex items-start space-x-2.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    <GraduationCap className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p>{selectedDoctor.education}</p>
                  </div>
                </div>

                {/* Available Slot details */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-5 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Available Days</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDoctor.availableDays.map((day, idx) => (
                        <span key={idx} className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                          isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-800 border-emerald-100/60"
                        }`}>
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-wider flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Regular Hours</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDoctor.availableHours.map((hour, idx) => (
                        <span key={idx} className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                          isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-50 text-zinc-600 border-zinc-200"
                        }`}>
                          {hour}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className={`flex justify-end gap-3 border-t pt-5 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className={`px-4 py-2 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isDark ? "border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    Close Profile
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDoctor(null);
                      onBookDoctor(selectedDoctor);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 transition-all ${
                      isDark ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                    }`}
                  >
                    <UserCheck className={`h-3.5 w-3.5 ${isDark ? "text-zinc-950" : "text-emerald-400"}`} />
                    <span>Book Appointment</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
