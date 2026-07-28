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
}

export default function Doctors({ selectedDepartment, setSelectedDepartment, onBookDoctor }: DoctorsProps) {
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
    <div className="py-12 bg-[#fbfbfc] font-sans text-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <span className="text-zinc-400 font-mono font-bold text-[10px] uppercase tracking-widest block">Medical Team</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight font-display">Our Specialists</h1>
            <p className="text-zinc-500 max-w-xl text-xs md:text-sm">
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
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 transition-all placeholder:text-zinc-400"
              id="doctor-search-input"
            />
          </div>
        </div>

        {/* Filter categories pills */}
        <div className="flex flex-wrap gap-2 mb-10 border-b border-zinc-100 pb-6">
          {departmentsList.map((dept, i) => (
            <button
              key={i}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                (selectedDepartment === dept || (dept === "All Departments" && selectedDepartment === ""))
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-8 w-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 text-xs font-medium">Loading specialist profiles...</p>
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDoctors.map((docProfile) => (
              <div 
                key={docProfile.id}
                className="bg-white border border-zinc-200/70 rounded-xl overflow-hidden hover:shadow-xs transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Doctor Image Header */}
                  <div className="relative h-60 bg-zinc-50 overflow-hidden">
                    <img 
                      src={docProfile.image} 
                      alt={docProfile.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                    />
                    {/* Specialty Tag floating */}
                    <span className="absolute bottom-3 left-3 bg-zinc-900/90 backdrop-blur-xs text-white text-[9px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-md border border-zinc-700/20">
                      {docProfile.specialty}
                    </span>
                    {/* Rating floating */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-zinc-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md flex items-center space-x-1 border border-zinc-200/80 shadow-xs">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{docProfile.rating.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-[9px] uppercase font-mono font-semibold text-zinc-400 tracking-wider">
                        {docProfile.department} department
                      </span>
                      <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors font-display">
                        {docProfile.name}
                      </h3>
                    </div>

                    <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                      {docProfile.bio}
                    </p>

                    <div className="space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs"><strong>Experience:</strong> {docProfile.experience}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate text-xs"><strong>Education:</strong> {docProfile.education}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6 pt-3 border-t border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50/50">
                  <button
                    onClick={() => setSelectedDoctor(docProfile)}
                    className="text-xs font-bold text-zinc-700 hover:text-zinc-900 cursor-pointer flex items-center space-x-0.5"
                  >
                    <span>Full Bio</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => onBookDoctor(docProfile)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Book Schedule</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-zinc-200/60 max-w-xl mx-auto space-y-4">
            <p className="text-zinc-400 text-xs font-semibold">No doctor profile matched your selected criteria.</p>
            <button
              onClick={() => {
                setSelectedDepartment("All Departments");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-zinc-900 hover:underline cursor-pointer"
            >
              Clear filters and search query
            </button>
          </div>
        )}

        {/* Doctor Bio Modal Popover */}
        {selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-sm border border-zinc-200">
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Modal Header */}
                <div className="flex justify-between items-start">
                  <div className="flex space-x-4">
                    <img 
                      src={selectedDoctor.image} 
                      alt={selectedDoctor.name} 
                      className="h-16 w-16 md:h-20 md:w-20 rounded-lg object-cover border border-zinc-200"
                    />
                    <div>
                      <span className="text-[9px] font-mono uppercase font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200 tracking-wider">
                        {selectedDoctor.department} Specialist
                      </span>
                      <h3 className="text-xl font-bold text-zinc-900 mt-1.5 font-display">{selectedDoctor.name}</h3>
                      <p className="text-xs text-zinc-500 font-medium font-sans">{selectedDoctor.specialty}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDoctor(null)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 cursor-pointer text-sm font-semibold h-8 w-8 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {/* Star rating and quick items */}
                <div className="flex flex-wrap items-center gap-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100 text-xs text-zinc-600">
                  <div className="flex items-center space-x-1 font-semibold">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>{selectedDoctor.rating.toFixed(2)} Patient Satisfaction Rating</span>
                  </div>
                  <div className="h-4 w-px bg-zinc-200"></div>
                  <div><strong>Experience:</strong> {selectedDoctor.experience}</div>
                </div>

                {/* Bio text */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Professional Bio</h4>
                  <p className="text-zinc-600 text-xs leading-relaxed">
                    {selectedDoctor.bio}
                  </p>
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Academic Background</h4>
                  <div className="flex items-start space-x-2.5 text-xs text-zinc-600">
                    <GraduationCap className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                    <p>{selectedDoctor.education}</p>
                  </div>
                </div>

                {/* Available Slot details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-zinc-100 pt-5">
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Available Days</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDoctor.availableDays.map((day, idx) => (
                        <span key={idx} className="text-[9px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100/60 px-2 py-0.5 rounded-md">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Regular Hours</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDoctor.availableHours.map((hour, idx) => (
                        <span key={idx} className="text-[9px] font-mono font-semibold bg-zinc-50 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-md">
                          {hour}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    Close Profile
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDoctor(null);
                      onBookDoctor(selectedDoctor);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 transition-all"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
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
