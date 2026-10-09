import React from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "../firebase";
import { Doctor, Appointment, Report, UserProfile, MedicalHistory } from "../types";
import { getApiUrl } from "../config";
import { 
  ShieldAlert, 
  Users, 
  Stethoscope, 
  DollarSign, 
  Settings, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Tag, 
  Eye, 
  AlertCircle,
  Pill,
  Lock,
  ArrowRight
} from "lucide-react";

interface AdminAdministratorProps {
  themeMode?: "light" | "dark";
}

export default function AdminAdministratorDashboard({ themeMode = "light" }: AdminAdministratorProps) {
  const isDark = themeMode === "dark";
  const [activeTab, setActiveTab] = React.useState<"overview" | "doctors" | "patients" | "pricing" | "site_settings">("overview");

  // Data states
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [patients, setPatients] = React.useState<UserProfile[]>([]);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [medicines, setMedicines] = React.useState<any[]>([]);
  const [bills, setBills] = React.useState<any[]>([]);
  const [medicinePurchases, setMedicinePurchases] = React.useState<any[]>([]);
  const [financialStats, setFinancialStats] = React.useState<any>({
    totalRevenue: 0,
    appointmentsRevenue: 0,
    pharmacyRevenue: 0,
    billsRevenue: 0,
    premiumRevenue: 0
  });
  const [loading, setLoading] = React.useState(true);

  // Search filters
  const [doctorSearch, setDoctorSearch] = React.useState("");
  const [patientSearch, setPatientSearch] = React.useState("");

  // Doctor Form Modal
  const [showDoctorModal, setShowDoctorModal] = React.useState(false);
  const [editingDoctor, setEditingDoctor] = React.useState<Doctor | null>(null);
  const [docName, setDocName] = React.useState("");
  const [docSpecialty, setDocSpecialty] = React.useState("");
  const [docDepartment, setDocDepartment] = React.useState("Cardiology");
  const [docExperience, setDocExperience] = React.useState("10 years");
  const [docEducation, setDocEducation] = React.useState("M.D. Harvard Medical School");
  const [docRating, setDocRating] = React.useState(4.9);
  const [docBio, setDocBio] = React.useState("");
  const [docImage, setDocImage] = React.useState("");
  const [docConsultationFee, setDocConsultationFee] = React.useState(3500);
  const [modalSaving, setModalSaving] = React.useState(false);

  // Pricing Form States
  const [bookingFee, setBookingFee] = React.useState(3500);
  const [premiumFee, setPremiumFee] = React.useState(500);
  const [savingPrices, setSavingPrices] = React.useState(false);
  const [priceNotice, setPriceNotice] = React.useState("");

  // Medicine Edit / Create States
  const [editingMed, setEditingMed] = React.useState<any | null>(null);
  const [medName, setMedName] = React.useState("");
  const [medCategory, setMedCategory] = React.useState("mild");
  const [medPrice, setMedPrice] = React.useState(1500);
  const [medDesc, setMedDesc] = React.useState("");
  const [showAddMed, setShowAddMed] = React.useState(false);

  // Site Settings States
  const [siteSettings, setSiteSettings] = React.useState({
    hospitalName: "GodsCare Hospital & Medical Center",
    tagline: "World-Class Compassionate Healthcare & Advanced Clinical Excellence",
    emergencyPhone: "+1 (800) 463-7227",
    generalPhone: "+1 (800) 555-0199",
    email: "care@godscarehospital.com",
    address: "742 Evergreen Healthcare Blvd, Medical District",
    announcement: "Notice: 24/7 Outpatient & Emergency services are fully operational.",
    announcementActive: true
  });
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [settingsNotice, setSettingsNotice] = React.useState("");

  // Patient Inspection Modal (shows what patient paid for + clinical history)
  const [inspectedPatient, setInspectedPatient] = React.useState<UserProfile | null>(null);
  const [inspectedPayments, setInspectedPayments] = React.useState<{
    appointments: Appointment[];
    medicines: any[];
    bills: any[];
    totalPaid: number;
  }>({ appointments: [], medicines: [], bills: [], totalPaid: 0 });

  // Load all data with resilient individual queries
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Doctors
      try {
        const docSnap = await getDocs(collection(db, "doctors"));
        const docList: Doctor[] = [];
        docSnap.forEach(d => docList.push(d.data() as Doctor));
        if (docList.length > 0) {
          setDoctors(docList);
        } else {
          // Fallback to API if firestore collection is empty
          const res = await fetch(getApiUrl("/api/doctors"));
          if (res.ok) {
            const list = await res.json();
            setDoctors(list);
          }
        }
      } catch (e) {
        console.warn("Doctors query fallback:", e);
        try {
          const res = await fetch(getApiUrl("/api/doctors"));
          if (res.ok) {
            const list = await res.json();
            setDoctors(list);
          }
        } catch (apiErr) {
          console.warn("Doctors API fallback error:", apiErr);
        }
      }

      // 2. Patients
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const pList: UserProfile[] = [];
        userSnap.forEach(d => {
          const u = d.data() as UserProfile;
          const role = (u.role || "").toString().toLowerCase().trim();
          if (role === "patient" || !role.includes("admin")) {
            pList.push(u);
          }
        });
        setPatients(pList);
      } catch (e) {
        console.warn("Patients query fallback:", e);
      }

      // 3. Appointments
      try {
        const appSnap = await getDocs(collection(db, "appointments"));
        const aList: Appointment[] = [];
        appSnap.forEach(d => aList.push(d.data() as Appointment));
        aList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAppointments(aList);
      } catch (e) {
        console.warn("Appointments query fallback:", e);
      }

      // 4. Medicines
      try {
        const medSnap = await getDocs(collection(db, "medicines"));
        const mList: any[] = [];
        medSnap.forEach(d => mList.push(d.data()));
        setMedicines(mList);
      } catch (e) {
        console.warn("Medicines query fallback:", e);
      }

      // 5. Medical Bills
      try {
        const billsSnap = await getDocs(collection(db, "medical_bills"));
        const bList: any[] = [];
        billsSnap.forEach(d => bList.push(d.data()));
        setBills(bList);
      } catch (e) {
        console.warn("Bills query fallback:", e);
      }

      // 6. Medicine purchases
      try {
        const purchasesSnap = await getDocs(collection(db, "medicine_purchases"));
        const purList: any[] = [];
        purchasesSnap.forEach(d => purList.push(d.data()));
        setMedicinePurchases(purList);
      } catch (e) {
        console.warn("Medicine purchases query fallback:", e);
      }

      // 7. Settings & Fees
      try {
        const setRes = await fetch(getApiUrl("/api/site/settings"));
        if (setRes.ok) {
          const sData = await setRes.json();
          setSiteSettings(sData);
          if (sData.appointmentBookingFee) setBookingFee(sData.appointmentBookingFee);
          if (sData.premiumSubscriptionFee) setPremiumFee(sData.premiumSubscriptionFee);
        }
      } catch (e) {
        console.warn("Settings fetch fallback:", e);
      }

      // 8. Financial Stats
      try {
        const finRes = await fetch(getApiUrl("/api/admin/financial-summary"));
        if (finRes.ok) {
          const fData = await finRes.json();
          setFinancialStats(fData);
        }
      } catch (e) {
        console.warn("Financial stats fallback:", e);
      }
    } catch (err) {
      console.error("Error loading Admin Administrator data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Doctor (Create or Edit)
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docSpecialty || !docDepartment) return;

    try {
      setModalSaving(true);
      const doctorId = editingDoctor ? editingDoctor.id : `doc-${Date.now()}`;
      const doctorData: Doctor = {
        id: doctorId,
        name: docName,
        specialty: docSpecialty,
        department: docDepartment,
        experience: docExperience,
        education: docEducation || "M.D. Board Certified",
        rating: Number(docRating) || 5.0,
        bio: docBio,
        image: docImage || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
        availableDays: editingDoctor ? editingDoctor.availableDays : ["Monday", "Wednesday", "Friday"],
        availableHours: editingDoctor ? editingDoctor.availableHours : ["09:00 AM", "11:00 AM", "02:00 PM"],
        consultationFee: Number(docConsultationFee) || 3500
      };

      await setDoc(doc(db, "doctors", doctorId), doctorData, { merge: true });
      setShowDoctorModal(false);
      setEditingDoctor(null);
      await loadData();
    } catch (err) {
      console.error("Error saving doctor:", err);
    } finally {
      setModalSaving(false);
    }
  };

  // Handle Delete Doctor
  const handleDeleteDoctor = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the medical staff?`)) return;
    try {
      await deleteDoc(doc(db, "doctors", id));
      await loadData();
    } catch (err) {
      console.error("Error deleting doctor:", err);
    }
  };

  // Open Edit Doctor Modal
  const openEditDoctor = (d: Doctor) => {
    setEditingDoctor(d);
    setDocName(d.name);
    setDocSpecialty(d.specialty);
    setDocDepartment(d.department);
    setDocExperience(d.experience);
    setDocEducation(d.education);
    setDocRating(d.rating);
    setDocBio(d.bio);
    setDocImage(d.image);
    setDocConsultationFee(d.consultationFee || 3500);
    setShowDoctorModal(true);
  };

  // Open Add Doctor Modal
  const openAddDoctor = () => {
    setEditingDoctor(null);
    setDocName("");
    setDocSpecialty("");
    setDocDepartment("Cardiology");
    setDocExperience("10 years");
    setDocEducation("M.D. Harvard Medical School");
    setDocRating(5.0);
    setDocBio("");
    setDocImage("");
    setDocConsultationFee(3500);
    setShowDoctorModal(true);
  };

  // Save Pricing Changes
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPrices(true);
      setPriceNotice("");
      const res = await fetch(getApiUrl("/api/settings/fees/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentBookingFee: Number(bookingFee),
          premiumSubscriptionFee: Number(premiumFee)
        })
      });
      if (res.ok) {
        setPriceNotice("Site prices updated successfully!");
        setTimeout(() => setPriceNotice(""), 3000);
      }
    } catch (err) {
      console.error("Error saving prices:", err);
    } finally {
      setSavingPrices(false);
    }
  };

  // Save / Update Medicine
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName) return;
    try {
      if (editingMed) {
        await fetch(getApiUrl(`/api/medicines/${editingMed.id}/update`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: medName,
            price: Number(medPrice),
            category: medCategory,
            description: medDesc
          })
        });
      } else {
        await fetch(getApiUrl("/api/medicines/add"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: medName,
            price: Number(medPrice),
            category: medCategory,
            description: medDesc,
            symptoms: ["General Wellness"]
          })
        });
      }
      setEditingMed(null);
      setShowAddMed(false);
      setMedName("");
      setMedDesc("");
      await loadData();
    } catch (err) {
      console.error("Error saving medicine:", err);
    }
  };

  // Save Site Settings
  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsNotice("");
      const res = await fetch(getApiUrl("/api/site/settings/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...siteSettings,
          appointmentBookingFee: Number(bookingFee),
          premiumSubscriptionFee: Number(premiumFee)
        })
      });
      if (res.ok) {
        setSettingsNotice("Hospital configuration and announcements updated live across the entire site!");
        setTimeout(() => setSettingsNotice(""), 4000);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Inspect Patient Payments & Records
  const inspectPatient = (p: UserProfile) => {
    setInspectedPatient(p);
    const pApps = appointments.filter(a => a.patientId === p.uid);
    const pMeds = medicinePurchases.filter(m => m.patientId === p.uid);
    const pBills = bills.filter(b => b.patientId === p.uid);

    let totalPaid = 0;
    pApps.forEach(a => {
      if (a.paymentStatus === "paid" || a.amountPaid) totalPaid += Number(a.amountPaid || a.paymentAmount || 3500);
    });
    pMeds.forEach(m => {
      totalPaid += Number(m.price || 0);
    });
    pBills.forEach(b => {
      if (b.status === "paid") totalPaid += Number(b.amount || 0);
    });
    if (p.isPremium) totalPaid += 500;

    setInspectedPayments({
      appointments: pApps,
      medicines: pMeds,
      bills: pBills,
      totalPaid
    });
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.department.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors ${
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-zinc-900"
    }`}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Executive Header */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-lg relative overflow-hidden ${
          isDark 
            ? "bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 border-zinc-800" 
            : "bg-gradient-to-br from-white via-emerald-50/20 to-white border-emerald-100/80"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Admin Administrator • Executive Site Authority</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
                Hospital Command & Site Control Center
              </h1>
              <p className={`text-xs sm:text-sm max-w-2xl ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                You have unrestricted administrative authority: manage doctors, calibrate hospital prices, oversee all patients and payments, and modify site configuration.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all flex items-center gap-2 cursor-pointer bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Sync Data</span>
              </button>
              <button
                onClick={openAddDoctor}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>Add Doctor</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-200/20">
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"}`}>
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Medical Doctors</span>
                <Stethoscope className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black mt-2 font-display">{doctors.length}</div>
              <div className="text-[10px] text-emerald-500 font-medium mt-1">Full medical staff</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"}`}>
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Total Patients</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black mt-2 font-display">{patients.length}</div>
              <div className="text-[10px] text-blue-500 font-medium mt-1">Registered portals</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"}`}>
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Total Revenue</span>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black mt-2 font-display text-emerald-500">
                ₦{financialStats.totalRevenue?.toLocaleString() || "0"}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium mt-1">Total payments collected</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"}`}>
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Appointments</span>
                <Calendar className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black mt-2 font-display">{appointments.length}</div>
              <div className="text-[10px] text-purple-500 font-medium mt-1">Hospital bookings</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-2 border-zinc-200 dark:border-zinc-800">
          {[
            { id: "overview", label: "Overview & Financials", icon: TrendingUp },
            { id: "doctors", label: "Doctors Management", icon: Stethoscope },
            { id: "patients", label: "All Patients & Payments", icon: Users },
            { id: "pricing", label: "Prices of Things & Catalog", icon: DollarSign },
            { id: "site_settings", label: "Entire Site Settings", icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  active
                    ? isDark ? "bg-emerald-500 text-zinc-950 shadow-md" : "bg-zinc-900 text-white shadow-md"
                    : isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & FINANCIALS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`p-6 rounded-2xl border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200"}`}>
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-400">Revenue Breakdown</h3>
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs">Clinical Appointments</span>
                    <span className="font-mono font-bold text-emerald-500">₦{financialStats.appointmentsRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs">Pharmacy Medications</span>
                    <span className="font-mono font-bold text-emerald-500">₦{financialStats.pharmacyRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs">Medical Diagnostic Bills</span>
                    <span className="font-mono font-bold text-emerald-500">₦{financialStats.billsRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs">Premium Care Memberships</span>
                    <span className="font-mono font-bold text-emerald-500">₦{financialStats.premiumRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-bold text-sm">
                    <span>Total Hospital Receipts</span>
                    <span className="font-mono text-emerald-400 text-base">₦{financialStats.totalRevenue?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-2xl border md:col-span-2 ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200"}`}>
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-400">Recent Hospital Appointments</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 font-mono text-zinc-400">
                        <th className="py-2">Patient</th>
                        <th className="py-2">Doctor</th>
                        <th className="py-2">Date & Time</th>
                        <th className="py-2">Payment</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {appointments.slice(0, 6).map(app => (
                        <tr key={app.id}>
                          <td className="py-2.5 font-semibold">{app.patientName}</td>
                          <td className="py-2.5 text-zinc-400">{app.doctorName}</td>
                          <td className="py-2.5 font-mono text-[11px]">{app.date} • {app.time}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              app.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            }`}>
                              {app.paymentStatus || "unpaid"}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCTORS MANAGEMENT */}
        {activeTab === "doctors" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name, specialty..."
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border ${
                    isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200"
                  }`}
                />
              </div>

              <button
                onClick={openAddDoctor}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>Add Doctor to Site</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map(docItem => (
                <div
                  key={docItem.id}
                  className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={docItem.image}
                        alt={docItem.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800"
                      />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-emerald-500 font-bold tracking-wider">
                          {docItem.department}
                        </span>
                        <h4 className="text-base font-bold font-display">{docItem.name}</h4>
                        <p className="text-xs text-zinc-400">{docItem.specialty}</p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {docItem.bio}
                    </p>

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Consultation Fee:</span>
                        <span className="font-mono font-bold text-emerald-500">
                          ₦{(docItem.consultationFee || 3500).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Experience:</span>
                        <span>{docItem.experience}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Rating:</span>
                        <span className="text-amber-400 font-bold">⭐ {docItem.rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditDoctor(docItem)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit & Prices</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(docItem.id, docItem.name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-rose-500 border border-rose-500/30 hover:bg-rose-500/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ALL PATIENTS & PAYMENTS */}
        {activeTab === "patients" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search patients by name or email..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border ${
                    isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200"
                  }`}
                />
              </div>
              <div className="text-xs font-mono text-zinc-400">
                Showing {filteredPatients.length} registered patients
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-xs text-left">
                <thead className={`font-mono text-zinc-400 uppercase text-[10px] ${
                  isDark ? "bg-zinc-900" : "bg-slate-100"
                }`}>
                  <tr>
                    <th className="p-3.5">Patient Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Membership</th>
                    <th className="p-3.5">Appointments</th>
                    <th className="p-3.5">Payments & History</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredPatients.map(pat => {
                    const patientApps = appointments.filter(a => a.patientId === pat.uid);
                    return (
                      <tr key={pat.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="p-3.5 font-bold font-display">{pat.name}</td>
                        <td className="p-3.5 text-zinc-400 font-mono">{pat.email}</td>
                        <td className="p-3.5">
                          {pat.isPremium ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 font-bold">
                              PREMIUM CARE
                            </span>
                          ) : (
                            <span className="text-zinc-500">Standard</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono">{patientApps.length} Bookings</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => inspectPatient(pat)}
                            className="px-3 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View What They Paid For</span>
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => inspectPatient(pat)}
                            className="text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <ArrowRight className="h-4 w-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PRICING OF THINGS & CATALOG */}
        {activeTab === "pricing" && (
          <div className="space-y-8">
            {priceNotice && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{priceNotice}</span>
              </div>
            )}

            {/* Base Hospital Fees Form */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-emerald-500" />
                <h3 className="text-base font-bold font-display">Hospital Service Base Rates</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Adjust baseline charges applied across the hospital for consultations and patient subscription tiering.
              </p>

              <form onSubmit={handleSavePrices} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">
                    Base Appointment Booking Fee (NGN ₦)
                  </label>
                  <input
                    type="number"
                    value={bookingFee}
                    onChange={e => setBookingFee(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border text-sm font-mono ${
                      isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                    }`}
                    required
                  />
                  <span className="text-[10px] text-zinc-500 block">Current default fee when booking specialist appointments</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">
                    Premium Care Plan Subscription Fee (NGN ₦)
                  </label>
                  <input
                    type="number"
                    value={premiumFee}
                    onChange={e => setPremiumFee(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border text-sm font-mono ${
                      isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                    }`}
                    required
                  />
                  <span className="text-[10px] text-zinc-500 block">Subscription charge for VIP clinical monitoring and AI insights</span>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPrices}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {savingPrices ? "Updating Prices..." : "Save Hospital Base Fees"}
                  </button>
                </div>
              </form>
            </div>

            {/* Pharmacy Medications Pricing */}
            <div className={`p-6 rounded-2xl border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200"}`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-base font-bold font-display">Pharmacy Medication Prices & Catalog</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Control medication prices dispensed in the clinical pharmacy catalog.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingMed(null);
                    setMedName("");
                    setMedPrice(1500);
                    setMedCategory("mild");
                    setMedDesc("");
                    setShowAddMed(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Medication</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-xs text-left">
                  <thead className={`font-mono text-zinc-400 text-[10px] uppercase ${isDark ? "bg-zinc-800/60" : "bg-slate-100"}`}>
                    <tr>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price (NGN)</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {medicines.map(med => (
                      <tr key={med.id}>
                        <td className="p-3 font-bold">{med.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300">
                            {med.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-500">
                          ₦{med.price?.toLocaleString()}
                        </td>
                        <td className="p-3 text-zinc-400 max-w-xs truncate">{med.description}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingMed(med);
                              setMedName(med.name);
                              setMedPrice(med.price);
                              setMedCategory(med.category);
                              setMedDesc(med.description);
                              setShowAddMed(true);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-mono border border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                          >
                            Edit Price
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ENTIRE SITE SETTINGS */}
        {activeTab === "site_settings" && (
          <div className="space-y-6">
            {settingsNotice && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{settingsNotice}</span>
              </div>
            )}

            <div className={`p-6 rounded-2xl border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-emerald-500" />
                <h3 className="text-base font-bold font-display">Hospital Branding & Site-Wide Directives</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Change site-wide identity, emergency numbers, physical location, and banner broadcast notifications.
              </p>

              <form onSubmit={handleSaveSiteSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">Hospital Name</label>
                    <input
                      type="text"
                      value={siteSettings.hospitalName}
                      onChange={e => setSiteSettings({ ...siteSettings, hospitalName: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm ${
                        isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">Tagline / Mission</label>
                    <input
                      type="text"
                      value={siteSettings.tagline}
                      onChange={e => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm ${
                        isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">Emergency Hotline Phone</label>
                    <input
                      type="text"
                      value={siteSettings.emergencyPhone}
                      onChange={e => setSiteSettings({ ...siteSettings, emergencyPhone: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm font-mono ${
                        isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">General Inquiries Phone</label>
                    <input
                      type="text"
                      value={siteSettings.generalPhone}
                      onChange={e => setSiteSettings({ ...siteSettings, generalPhone: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm font-mono ${
                        isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">Official Support Email</label>
                    <input
                      type="email"
                      value={siteSettings.email}
                      onChange={e => setSiteSettings({ ...siteSettings, email: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm font-mono ${
                        isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">Hospital Facility Address</label>
                    <input
                      type="text"
                      value={siteSettings.address}
                      onChange={e => setSiteSettings({ ...siteSettings, address: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm ${
                        isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">
                      Broadcast Announcement Banner
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettings.announcementActive}
                        onChange={e => setSiteSettings({ ...siteSettings, announcementActive: e.target.checked })}
                        className="rounded"
                      />
                      <span>Display banner on site header</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={siteSettings.announcement}
                    onChange={e => setSiteSettings({ ...siteSettings, announcement: e.target.value })}
                    className={`w-full p-3 rounded-xl border text-xs leading-relaxed ${
                      isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200"
                    }`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {savingSettings ? "Broadcasting Changes..." : "Apply Site-Wide Settings"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DOCTOR ADD/EDIT */}
        {showDoctorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
            <div className={`p-6 sm:p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-2xl ${
              isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            }`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold font-display">
                  {editingDoctor ? `Edit Doctor: ${editingDoctor.name}` : "Add New Medical Doctor"}
                </h3>
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDoctor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Doctor Full Name</label>
                    <input
                      type="text"
                      placeholder="Dr. Alexander Wright"
                      value={docName}
                      onChange={e => setDocName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Specialty</label>
                    <input
                      type="text"
                      placeholder="Consultant Cardiologist"
                      value={docSpecialty}
                      onChange={e => setDocSpecialty(e.target.value)}
                      className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Department</label>
                    <select
                      value={docDepartment}
                      onChange={e => setDocDepartment(e.target.value)}
                      className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Consultation Fee (NGN ₦)</label>
                    <input
                      type="number"
                      placeholder="3500"
                      value={docConsultationFee}
                      onChange={e => setDocConsultationFee(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border text-xs font-mono bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Experience</label>
                    <input
                      type="text"
                      placeholder="12 years"
                      value={docExperience}
                      onChange={e => setDocExperience(e.target.value)}
                      className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Rating (0.0 - 5.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={docRating}
                      onChange={e => setDocRating(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border text-xs font-mono bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Photo Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={docImage}
                    onChange={e => setDocImage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs font-mono bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Clinical Bio & Credentials</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of doctor's medical background..."
                    value={docBio}
                    onChange={e => setDocBio(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDoctorModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-mono border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer shadow-md"
                  >
                    {modalSaving ? "Saving..." : editingDoctor ? "Update Doctor" : "Publish Doctor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT MEDICINE */}
        {showAddMed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
            <div className={`p-6 rounded-2xl max-w-md w-full border shadow-2xl ${
              isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold font-display">
                  {editingMed ? `Edit Price: ${editingMed.name}` : "Add Pharmacy Medicine"}
                </h3>
                <button onClick={() => setShowAddMed(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMedicine} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Medicine Name</label>
                  <input
                    type="text"
                    value={medName}
                    onChange={e => setMedName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Price (NGN ₦)</label>
                  <input
                    type="number"
                    value={medPrice}
                    onChange={e => setMedPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border text-xs font-mono bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Category</label>
                  <select
                    value={medCategory}
                    onChange={e => setMedCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                  >
                    <option value="mild">Mild (OTC / Vitamins)</option>
                    <option value="moderate">Moderate (Anti-inflammatory / Pain)</option>
                    <option value="severe">Severe (Prescription / Antibiotics)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Description</label>
                  <textarea
                    rows={2}
                    value={medDesc}
                    onChange={e => setMedDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMed(false)}
                    className="px-4 py-2 rounded-xl text-xs font-mono border border-zinc-700 text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  >
                    Save Price
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PATIENT PAYMENT INSPECTOR */}
        {inspectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
            <div className={`p-6 sm:p-8 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border shadow-2xl ${
              isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            }`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="inline-block text-[10px] font-mono font-bold uppercase text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 mb-1">
                    Patient Payment & Clinical Ledger
                  </div>
                  <h3 className="text-xl font-bold font-display">{inspectedPatient.name}</h3>
                  <p className="text-xs text-zinc-400 font-mono">{inspectedPatient.email}</p>
                </div>
                <button
                  onClick={() => setInspectedPatient(null)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6 flex justify-between items-center">
                <span className="text-xs font-mono font-bold uppercase text-emerald-400">Total Amount Paid by Patient</span>
                <span className="text-xl font-mono font-extrabold text-emerald-400">
                  ₦{inspectedPayments.totalPaid.toLocaleString()}
                </span>
              </div>

              {/* Payments breakdown */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 mb-2">
                    Appointment Booking Payments ({inspectedPayments.appointments.length})
                  </h4>
                  {inspectedPayments.appointments.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No appointment payments logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {inspectedPayments.appointments.map(a => (
                        <div key={a.id} className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold">{a.doctorName}</span> ({a.specialty})
                            <div className="text-[10px] text-zinc-400 font-mono">{a.date} • {a.time} • Ref: {a.paymentReference || "N/A"}</div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-emerald-400">₦{(a.amountPaid || a.paymentAmount || 3500).toLocaleString()}</span>
                            <span className="block text-[10px] text-zinc-400 uppercase">{a.paymentStatus || "unpaid"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 mb-2">
                    Pharmacy Orders Paid ({inspectedPayments.medicines.length})
                  </h4>
                  {inspectedPayments.medicines.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No medication purchases logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {inspectedPayments.medicines.map(m => (
                        <div key={m.id} className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold">{m.medicineName}</span>
                            <div className="text-[10px] text-zinc-400 font-mono">Purchased: {new Date(m.purchasedAt).toLocaleDateString()} • Ref: {m.paymentReference || "N/A"}</div>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">₦{m.price?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 mb-2">
                    Medical Bills & Diagnostics ({inspectedPayments.bills.length})
                  </h4>
                  {inspectedPayments.bills.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No medical bills on record.</p>
                  ) : (
                    <div className="space-y-2">
                      {inspectedPayments.bills.map(b => (
                        <div key={b.id} className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold">{b.title}</span>
                            <div className="text-[10px] text-zinc-400 font-mono">Status: {b.status?.toUpperCase()}</div>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">₦{b.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setInspectedPatient(null)}
                  className="px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
