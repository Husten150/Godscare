import React from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "../firebase";
import { Doctor, Appointment, Report, UserProfile, AppointmentStatus, MedicalHistory, PastVisit } from "../types";
import { getApiUrl } from "../config";
import { 
  Users, 
  Calendar, 
  Clock, 
  Shield, 
  HeartPulse, 
  Plus, 
  Trash2, 
  Edit, 
  Filter, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Search, 
  PlusCircle, 
  UserCheck,
  Award,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Hospital,
  Pill,
  CreditCard,
  Mail
} from "lucide-react";

export default function AdminPanel() {
  const [activeSubTab, setActiveSubTab] = React.useState<"appointments" | "doctors" | "patients" | "billing_fees" | "feedbacks">("appointments");
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [patients, setPatients] = React.useState<UserProfile[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters & Search
  const [appFilter, setAppFilter] = React.useState<string>("All Statuses");
  const [patientSearch, setPatientSearch] = React.useState("");
  const [doctorSearch, setDoctorSearch] = React.useState("");

  // Doctor Form Modal (for adding / editing)
  const [showDoctorModal, setShowDoctorModal] = React.useState(false);
  const [editingDoctor, setEditingDoctor] = React.useState<Doctor | null>(null);
  const [docName, setDocName] = React.useState("");
  const [docSpecialty, setDocSpecialty] = React.useState("");
  const [docDept, setDocDept] = React.useState("Cardiology");
  const [docExp, setDocExp] = React.useState("");
  const [docEdu, setDocEdu] = React.useState("");
  const [docRating, setDocRating] = React.useState(5.0);
  const [docBio, setDocBio] = React.useState("");
  const [docImg, setDocImg] = React.useState("");
  const [modalError, setModalError] = React.useState("");
  const [modalSuccess, setModalSuccess] = React.useState("");
  const [modalLoading, setModalLoading] = React.useState(false);

  // Patient Inspector Modal
  const [selectedPatient, setSelectedPatient] = React.useState<UserProfile | null>(null);
  const [patientAppointments, setPatientAppointments] = React.useState<Appointment[]>([]);
  const [patientReports, setPatientReports] = React.useState<Report[]>([]);
  const [inspectorLoading, setInspectorLoading] = React.useState(false);

  // Patient Medical History State inside inspector
  const [inspectedMedHistory, setInspectedMedHistory] = React.useState<MedicalHistory | null>(null);
  const [newVisitDoctorName, setNewVisitDoctorName] = React.useState("");
  const [newVisitSpecialty, setNewVisitSpecialty] = React.useState("");
  const [newVisitReason, setNewVisitReason] = React.useState("");
  const [newVisitSummary, setNewVisitSummary] = React.useState("");
  const [newVisitPrescription, setNewVisitPrescription] = React.useState("");
  const [newVisitDate, setNewVisitDate] = React.useState("");
  const [newVisitError, setNewVisitError] = React.useState("");
  const [newVisitSuccess, setNewVisitSuccess] = React.useState("");
  const [savingVisit, setSavingVisit] = React.useState(false);

  // Billing & Fees Management States
  const [adminMedicines, setAdminMedicines] = React.useState<any[]>([]);
  const [adminBookingFee, setAdminBookingFee] = React.useState(3500);
  const [adminPremiumFee, setAdminPremiumFee] = React.useState(500);
  const [updatingFees, setUpdatingFees] = React.useState(false);
  const [feesSuccess, setFeesSuccess] = React.useState("");

  // Client Feedbacks State
  const [feedbacksList, setFeedbacksList] = React.useState<any[]>([]);

  // Medicine Edit State
  const [editingMedicineId, setEditingMedicineId] = React.useState<string | null>(null);
  const [editMedPrice, setEditMedPrice] = React.useState("");
  const [editMedName, setEditMedName] = React.useState("");
  const [editMedDesc, setEditMedDesc] = React.useState("");
  const [updatingMedicine, setUpdatingMedicine] = React.useState(false);

  // Medicine Create State
  const [showAddMedForm, setShowAddMedForm] = React.useState(false);
  const [newMedName, setNewMedName] = React.useState("");
  const [newMedCategory, setNewMedCategory] = React.useState("mild");
  const [newMedSymptoms, setNewMedSymptoms] = React.useState("");
  const [newMedDescription, setNewMedDescription] = React.useState("");
  const [newMedPrice, setNewMedPrice] = React.useState("");
  const [addingNewMed, setAddingNewMed] = React.useState(false);
  const [addMedError, setAddMedError] = React.useState("");
  const [addMedSuccess, setAddMedSuccess] = React.useState("");

  // Bills Management States
  const [selectedBillingPatientId, setSelectedBillingPatientId] = React.useState("");
  const [selectedPatientBills, setSelectedPatientBills] = React.useState<any[]>([]);
  const [loadingBills, setLoadingBills] = React.useState(false);
  const [newBillTitle, setNewBillTitle] = React.useState("");
  const [newBillAmount, setNewBillAmount] = React.useState("");
  const [creatingBill, setCreatingBill] = React.useState(false);
  const [billError, setBillError] = React.useState("");
  const [billSuccess, setBillSuccess] = React.useState("");

  // Edit Bill State
  const [editingBillId, setEditingBillId] = React.useState<string | null>(null);
  const [editBillAmount, setEditBillAmount] = React.useState("");
  const [editBillTitle, setEditBillTitle] = React.useState("");
  const [updatingBill, setUpdatingBill] = React.useState(false);

  // Load all system records
  const loadAdminData = React.useCallback(async () => {
    try {
      setLoading(true);

      // 1. Load doctors
      const docsSnap = await getDocs(collection(db, "doctors"));
      const docsList: Doctor[] = [];
      docsSnap.forEach((d) => {
        docsList.push(d.data() as Doctor);
      });
      setDoctors(docsList);

      // 2. Load all appointments in system
      const appSnap = await getDocs(collection(db, "appointments"));
      const appList: Appointment[] = [];
      appSnap.forEach((d) => {
        appList.push(d.data() as Appointment);
      });
      appList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAppointments(appList);

      // 3. Load all registered patients (role === 'patient')
      const patientsQuery = query(collection(db, "users"), where("role", "==", "patient"));
      const patientSnap = await getDocs(patientsQuery);
      const patientList: UserProfile[] = [];
      patientSnap.forEach((d) => {
        patientList.push(d.data() as UserProfile);
      });
      setPatients(patientList);

      // 4. Load all reports (for metrics)
      const reportsSnap = await getDocs(collection(db, "reports"));
      const reportsList: Report[] = [];
      reportsSnap.forEach((d) => {
        reportsList.push(d.data() as Report);
      });
      setReports(reportsList);

      // 5. Load medicines
      try {
        const medRes = await fetch(getApiUrl("/api/medicines"));
        if (medRes.ok) {
          const medData = await medRes.json();
          setAdminMedicines(medData);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load admin medicines catalog from API, falling back to direct Firestore read:", e);
        try {
          const medColRef = collection(db, "medicines");
          const snap = await getDocs(medColRef);
          const medsList: any[] = [];
          snap.forEach((docSnap) => medsList.push(docSnap.data()));
          if (medsList.length > 0) {
            medsList.sort((a, b) => a.id.localeCompare(b.id));
            setAdminMedicines(medsList);
          }
        } catch (fbErr) {
          console.error("Firestore medicines read failed:", fbErr);
        }
      }

      // 6. Load settings/fees
      try {
        const feesRes = await fetch(getApiUrl("/api/settings/fees"));
        if (feesRes.ok) {
          const feesData = await feesRes.json();
          if (feesData.appointmentBookingFee) setAdminBookingFee(feesData.appointmentBookingFee);
          if (feesData.premiumSubscriptionFee) setAdminPremiumFee(feesData.premiumSubscriptionFee);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load admin fees settings from API, falling back to direct Firestore read:", e);
        try {
          const docRef = doc(db, "system_settings", "fees");
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const feesData = snap.data();
            if (feesData.appointmentBookingFee) setAdminBookingFee(feesData.appointmentBookingFee);
            if (feesData.premiumSubscriptionFee) setAdminPremiumFee(feesData.premiumSubscriptionFee);
          }
        } catch (fbErr) {
          console.error("Firestore fees read failed:", fbErr);
        }
      }

      // 7. Load client feedbacks
      try {
        const feedbacksRes = await fetch(getApiUrl("/api/feedbacks"));
        if (feedbacksRes.ok) {
          const feedbacksData = await feedbacksRes.json();
          setFeedbacksList(feedbacksData);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load admin client feedbacks from API, falling back to direct Firestore read:", e);
        try {
          const feedbackCol = collection(db, "feedbacks");
          const snap = await getDocs(feedbackCol);
          const feedbackList: any[] = [];
          snap.forEach((docSnap) => feedbackList.push(docSnap.data()));
          feedbackList.sort((a, b) => new Date(b.submittedAt || b.timestamp || 0).getTime() - new Date(a.submittedAt || a.timestamp || 0).getTime());
          setFeedbacksList(feedbackList);
        } catch (fbErr) {
          console.error("Firestore feedbacks read failed:", fbErr);
        }
      }

    } catch (err) {
      console.error("Admin data loading failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Handle appointment status updates (Confirm / Complete / Cancel)
  const updateAppointmentStatus = async (appId: string, newStatus: AppointmentStatus) => {
    try {
      const colRef = collection(db, "appointments");
      const appSnap = await getDocs(colRef);
      let docRefId = "";
      appSnap.forEach((snap) => {
        const app = snap.data() as Appointment;
        if (app.id === appId) {
          docRefId = snap.id;
        }
      });

      if (docRefId) {
        await updateDoc(doc(db, "appointments", docRefId), {
          status: newStatus
        });
        loadAdminData();
      }
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Failed to update status.");
    }
  };

  // Complete appointment and transition to writing a clinical summary for that patient
  const handleCompleteAndSummarize = async (app: Appointment) => {
    try {
      // 1. Mark appointment as completed
      const colRef = collection(db, "appointments");
      const appSnap = await getDocs(colRef);
      let docRefId = "";
      appSnap.forEach((snap) => {
        const item = snap.data() as Appointment;
        if (item.id === app.id) {
          docRefId = snap.id;
        }
      });

      if (docRefId) {
        await updateDoc(doc(db, "appointments", docRefId), {
          status: "completed"
        });
      }

      // 2. Load the patient's UserProfile
      const patientQuery = query(collection(db, "users"), where("uid", "==", app.patientId));
      const patientSnap = await getDocs(patientQuery);
      let patientProfile: UserProfile | null = null;
      patientSnap.forEach((docSnap) => {
        patientProfile = docSnap.data() as UserProfile;
      });

      if (patientProfile) {
        // 3. Select patients sub-tab
        setActiveSubTab("patients");
        // 4. Load full records of the patient
        await inspectPatient(patientProfile);
        
        // 5. Pre-fill the new visit details
        setNewVisitDoctorName(app.doctorName || "");
        setNewVisitSpecialty(app.specialty || "");
        setNewVisitReason(`Appointment: ${app.notes || "General Consultation"}`);
        setNewVisitDate(app.date || new Date().toISOString().split("T")[0]);
        setNewVisitSummary("");
        setNewVisitPrescription("");
      } else {
        alert("Patient profile not found in system directory.");
      }
      
      // Reload admin data to refresh appointments table
      loadAdminData();
    } catch (err) {
      console.error("Complete & Summarize failed:", err);
      alert("Error completing appointment and transitioning.");
    }
  };

  // Inspect specific patient records
  const inspectPatient = async (patient: UserProfile) => {
    try {
      setSelectedPatient(patient);
      setInspectorLoading(true);

      // Load appointments for this patient
      const appSnap = await getDocs(query(collection(db, "appointments"), where("patientId", "==", patient.uid)));
      const appList: Appointment[] = [];
      appSnap.forEach((d) => appList.push(d.data() as Appointment));
      setPatientAppointments(appList);

      // Load reports for this patient
      const repSnap = await getDocs(query(collection(db, "reports"), where("patientId", "==", patient.uid)));
      const repList: Report[] = [];
      repSnap.forEach((d) => repList.push(d.data() as Report));
      setPatientReports(repList);

      // Load medical history for this patient
      const medRef = doc(db, "medical_histories", patient.uid);
      const medSnap = await getDoc(medRef);
      if (medSnap.exists()) {
        setInspectedMedHistory(medSnap.data() as MedicalHistory);
      } else {
        setInspectedMedHistory(null);
      }

      // Initialize defaults for a new visit summary
      setNewVisitDoctorName("");
      setNewVisitSpecialty("");
      setNewVisitReason("");
      setNewVisitSummary("");
      setNewVisitPrescription("");
      setNewVisitDate(new Date().toISOString().split("T")[0]);
      setNewVisitError("");
      setNewVisitSuccess("");

    } catch (err) {
      console.error("Inspector load failed:", err);
    } finally {
      setInspectorLoading(false);
    }
  };

  // Add a new visit entry (PastVisit) to inspected patient's medical history
  const handleAddVisitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (savingVisit) return;

    setNewVisitError("");
    setNewVisitSuccess("");

    if (!newVisitDoctorName || !newVisitReason || !newVisitSummary || !newVisitDate) {
      setNewVisitError("Please fill out Doctor Name, Date, Reason, and Assessment Summary.");
      return;
    }

    try {
      setSavingVisit(true);

      const medRef = doc(db, "medical_histories", selectedPatient.uid);
      const currentSnap = await getDoc(medRef);

      let chronicConditions: string[] = [];
      let allergies: string[] = [];
      let bloodType = "";
      let pastVisits: PastVisit[] = [];

      if (currentSnap.exists()) {
        const currentData = currentSnap.data() as MedicalHistory;
        chronicConditions = currentData.chronicConditions || [];
        allergies = currentData.allergies || [];
        bloodType = currentData.bloodType || "";
        pastVisits = currentData.pastVisits || [];
      }

      const newVisit: PastVisit = {
        id: `visit-${Date.now()}`,
        date: newVisitDate,
        doctorName: newVisitDoctorName,
        specialty: newVisitSpecialty || "General Medicine",
        reason: newVisitReason,
        summary: newVisitSummary,
        prescription: newVisitPrescription || undefined
      };

      // Append new visit, sorted descending
      const updatedVisits = [newVisit, ...pastVisits];
      updatedVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const updatedHistory: MedicalHistory = {
        id: selectedPatient.uid,
        patientId: selectedPatient.uid,
        bloodType: bloodType,
        allergies: allergies,
        chronicConditions: chronicConditions,
        pastVisits: updatedVisits,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(medRef, updatedHistory);
      setInspectedMedHistory(updatedHistory);

      setNewVisitSuccess("Clinical visit summary successfully appended to patient's medical record.");
      
      // Reset input fields except doctor info for convenience
      setNewVisitReason("");
      setNewVisitSummary("");
      setNewVisitPrescription("");
    } catch (err: any) {
      console.error("Failed to save visit entry:", err);
      setNewVisitError(err.message || "Could not append visit entry.");
    } finally {
      setSavingVisit(false);
    }
  };

  // Update global system fees
  const handleUpdateGlobalFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingFees(true);
    setFeesSuccess("");
    try {
      const res = await fetch(getApiUrl("/api/settings/fees/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentBookingFee: Number(adminBookingFee),
          premiumSubscriptionFee: Number(adminPremiumFee)
        })
      });
      if (res.ok) {
        setFeesSuccess("Global system fees have been updated successfully and took effect immediately!");
        setTimeout(() => setFeesSuccess(""), 5000);
      } else {
        const d = await res.json();
        throw new Error(d.error || "Failed to update global fees.");
      }
    } catch (err: any) {
      console.warn("Server fees update failed, attempting direct Firestore fallback:", err);
      try {
        const docRef = doc(db, "system_settings", "fees");
        await setDoc(docRef, {
          appointmentBookingFee: Number(adminBookingFee),
          premiumSubscriptionFee: Number(adminPremiumFee)
        });
        setFeesSuccess("Global system fees updated successfully via secure client-side database!");
        setTimeout(() => setFeesSuccess(""), 5000);
      } catch (fallbackErr: any) {
        console.error("Firestore fees update fallback failed:", fallbackErr);
        alert(`Error: ${fallbackErr.message || "Failed to update fees."}`);
      }
    } finally {
      setUpdatingFees(false);
    }
  };

  // Update a medicine details/price
  const handleUpdateMedicinePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicineId) return;
    setUpdatingMedicine(true);
    try {
      const res = await fetch(getApiUrl(`/api/medicines/${editingMedicineId}/update`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(editMedPrice),
          name: editMedName,
          description: editMedDesc
        })
      });
      if (res.ok) {
        setEditingMedicineId(null);
        loadAdminData();
      } else {
        const d = await res.json();
        throw new Error(d.error || "Failed to update medicine.");
      }
    } catch (err: any) {
      console.warn("Server medicine update failed, attempting direct Firestore fallback:", err);
      try {
        const medRef = doc(db, "medicines", editingMedicineId);
        await updateDoc(medRef, {
          price: Number(editMedPrice),
          name: editMedName,
          description: editMedDesc
        });
        setEditingMedicineId(null);
        loadAdminData();
        alert("Medicine updated successfully via secure client-side database!");
      } catch (fallbackErr: any) {
        console.error("Firestore medicine update fallback failed:", fallbackErr);
        alert(`Error: ${fallbackErr.message || "Failed to update medicine."}`);
      }
    } finally {
      setUpdatingMedicine(false);
    }
  };

  // Submit Add New Medicine Form
  const handleAddNewMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingNewMed) return;

    setAddMedError("");
    setAddMedSuccess("");

    if (!newMedName || !newMedDescription || !newMedPrice) {
      setAddMedError("Please fill in Medicine Name, Description, and Retail Price.");
      return;
    }

    try {
      setAddingNewMed(true);
      const res = await fetch(getApiUrl("/api/medicines/add"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMedName,
          category: newMedCategory,
          symptoms: newMedSymptoms,
          description: newMedDescription,
          price: Number(newMedPrice)
        })
      });

      if (res.ok) {
        setAddMedSuccess("New medicine formulation added to pharmacy stock successfully!");
        setNewMedName("");
        setNewMedSymptoms("");
        setNewMedDescription("");
        setNewMedPrice("");
        setNewMedCategory("mild");
        loadAdminData();
        setTimeout(() => {
          setShowAddMedForm(false);
          setAddMedSuccess("");
        }, 1500);
      } else {
        const d = await res.json();
        throw new Error(d.error || "Failed to add medicine.");
      }
    } catch (err: any) {
      console.warn("Server medicine addition failed, attempting direct Firestore fallback:", err);
      try {
        const newId = `med-${Date.now()}`;
        const symptomsArray = typeof newMedSymptoms === "string" 
          ? newMedSymptoms.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : ["General Symptoms"];
        
        const newMedData = {
          id: newId,
          name: newMedName,
          category: newMedCategory,
          symptoms: symptomsArray,
          description: newMedDescription,
          price: Number(newMedPrice)
        };

        const medRef = doc(db, "medicines", newId);
        await setDoc(medRef, newMedData);

        setAddMedSuccess("New medicine formulation added via secure client-side database!");
        setNewMedName("");
        setNewMedSymptoms("");
        setNewMedDescription("");
        setNewMedPrice("");
        setNewMedCategory("mild");
        loadAdminData();
        setTimeout(() => {
          setShowAddMedForm(false);
          setAddMedSuccess("");
        }, 1500);
      } catch (fallbackErr: any) {
        console.error("Firestore medicine addition fallback failed:", fallbackErr);
        setAddMedError(fallbackErr.message || "Error adding medicine formulation.");
      }
    } finally {
      setAddingNewMed(false);
    }
  };

  // Manage patient bills loader
  const loadPatientBills = React.useCallback(async (uid: string) => {
    if (!uid) {
      setSelectedPatientBills([]);
      return;
    }
    setLoadingBills(true);
    setBillError("");
    setBillSuccess("");
    try {
      const res = await fetch(getApiUrl(`/api/patients/${uid}/bills`));
      if (res.ok) {
        const data = await res.json();
        setSelectedPatientBills(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBills(false);
    }
  }, []);

  React.useEffect(() => {
    loadPatientBills(selectedBillingPatientId);
  }, [selectedBillingPatientId, loadPatientBills]);

  // Create a new bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillingPatientId || !newBillTitle || !newBillAmount) {
      setBillError("Please fill out both the bill description and amount.");
      return;
    }
    setCreatingBill(true);
    setBillError("");
    setBillSuccess("");
    try {
      const newBill = {
        id: `bill-${Date.now()}`,
        patientId: selectedBillingPatientId,
        title: newBillTitle,
        amount: Number(newBillAmount),
        status: "unpaid",
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "medical_bills", newBill.id), newBill);
      setNewBillTitle("");
      setNewBillAmount("");
      setBillSuccess("Medical bill registered successfully!");
      loadPatientBills(selectedBillingPatientId);
    } catch (err: any) {
      setBillError(err.message || "Failed to create medical bill.");
    } finally {
      setCreatingBill(false);
    }
  };

  // Update an existing bill
  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBillId) return;
    setUpdatingBill(true);
    try {
      const billRef = doc(db, "medical_bills", editingBillId);
      await updateDoc(billRef, {
        amount: Number(editBillAmount),
        title: editBillTitle
      });
      setEditingBillId(null);
      setBillSuccess("Bill updated successfully!");
      loadPatientBills(selectedBillingPatientId);
    } catch (err: any) {
      alert(err.message || "Failed to update bill.");
    } finally {
      setUpdatingBill(false);
    }
  };

  // Delete a bill
  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "medical_bills", billId));
      setBillSuccess("Bill deleted successfully.");
      loadPatientBills(selectedBillingPatientId);
    } catch (err: any) {
      alert(err.message || "Failed to delete bill.");
    }
  };

  // Trigger modal for adding a doctor
  const triggerAddDoctor = () => {
    setEditingDoctor(null);
    setDocName("");
    setDocSpecialty("");
    setDocDept("Cardiology");
    setDocExp("");
    setDocEdu("");
    setDocRating(4.9);
    setDocBio("");
    setDocImg("https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400");
    setModalError("");
    setModalSuccess("");
    setShowDoctorModal(true);
  };

  // Trigger modal for editing a doctor
  const triggerEditDoctor = (docProfile: Doctor) => {
    setEditingDoctor(docProfile);
    setDocName(docProfile.name);
    setDocSpecialty(docProfile.specialty);
    setDocDept(docProfile.department);
    setDocExp(docProfile.experience);
    setDocEdu(docProfile.education);
    setDocRating(docProfile.rating);
    setDocBio(docProfile.bio);
    setDocImg(docProfile.image);
    setModalError("");
    setModalSuccess("");
    setShowDoctorModal(true);
  };

  // Submit Doctor Add / Edit Form
  const handleSubmitDoctorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalLoading) return;

    setModalError("");
    setModalSuccess("");

    if (!docName || !docSpecialty || !docExp || !docEdu || !docBio || !docImg) {
      setModalError("Please complete all fields.");
      return;
    }

    try {
      setModalLoading(true);

      const doctorId = editingDoctor ? editingDoctor.id : `doc-${docName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const docData: Doctor = {
        id: doctorId,
        name: docName,
        specialty: docSpecialty,
        department: docDept,
        experience: docExp,
        education: docEdu,
        rating: parseFloat(docRating.toString()) || 4.9,
        availableDays: editingDoctor ? editingDoctor.availableDays : ["Monday", "Wednesday", "Friday"],
        availableHours: editingDoctor ? editingDoctor.availableHours : ["09:00 AM", "11:00 AM", "02:00 PM", "03:30 PM"],
        image: docImg,
        bio: docBio
      };

      // Set directly in firestore
      await setDoc(doc(db, "doctors", doctorId), docData);

      setModalSuccess(editingDoctor ? "Clinician updated successfully!" : "New clinician added to medical roster!");
      setTimeout(() => {
        setShowDoctorModal(false);
        loadAdminData();
      }, 1000);

    } catch (err: any) {
      console.error("Save doctor error:", err);
      setModalError(err.message || "Could not save doctor profile.");
    } finally {
      setModalLoading(false);
    }
  };

  // Delete doctor profile
  const handleDeleteDoctor = async (doctorId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently remove this clinician from the registry?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "doctors", doctorId));
      loadAdminData();
    } catch (err) {
      console.error("Delete doctor failed:", err);
      alert("Failed to delete clinician.");
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((app) => {
    const matchesFilter = appFilter === "All Statuses" || app.status === appFilter.toLowerCase();
    const matchesSearch = 
      app.patientName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      app.doctorName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      app.specialty.toLowerCase().includes(patientSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filtered Doctors
  const filteredDoctors = doctors.filter((docProfile) => {
    return (
      docProfile.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      docProfile.specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      docProfile.department.toLowerCase().includes(doctorSearch.toLowerCase())
    );
  });

  // Filtered Patients List
  const filteredPatients = patients.filter((pat) => {
    return pat.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
           pat.email.toLowerCase().includes(patientSearch.toLowerCase());
  });

  return (
    <div className="py-12 bg-[#fbfbfc] font-sans min-h-[90vh] text-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Title line */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-zinc-400 font-mono text-[9px] font-bold uppercase tracking-widest block">Administration Command</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2 font-display">
              <Shield className="h-6 w-6 text-zinc-800" />
              <span>Hospital Console</span>
            </h1>
            <p className="text-zinc-500 text-xs font-sans">Monitor hospital capacities, configure specialist registries, and review schedules.</p>
          </div>

          <button
            onClick={loadAdminData}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reload Systems</span>
          </button>
        </div>

        {/* METRICS DASHBOARD */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-zinc-200 p-5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Active Visits</span>
              <div className="p-1 bg-zinc-100 text-zinc-600 rounded border border-zinc-200"><Calendar className="h-3.5 w-3.5" /></div>
            </div>
            <p className="text-2xl font-black text-zinc-950 font-display">{appointments.filter(a => a.status === "confirmed").length}</p>
            <p className="text-[9px] font-mono text-zinc-400">Confirmed visits</p>
          </div>

          <div className="bg-white border border-zinc-200 p-5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Pending Approvals</span>
              <div className="p-1 bg-amber-50 text-amber-600 rounded border border-amber-200"><Clock className="h-3.5 w-3.5" /></div>
            </div>
            <p className="text-2xl font-black text-zinc-950 font-display">{appointments.filter(a => a.status === "pending").length}</p>
            <p className="text-[9px] font-mono text-amber-600 font-semibold">Action required</p>
          </div>

          <div className="bg-white border border-zinc-200 p-5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Clinicians Roster</span>
              <div className="p-1 bg-zinc-100 text-zinc-600 rounded border border-zinc-200"><HeartPulse className="h-3.5 w-3.5" /></div>
            </div>
            <p className="text-2xl font-black text-zinc-950 font-display">{doctors.length}</p>
            <p className="text-[9px] font-mono text-zinc-400">Active medical specialists</p>
          </div>

          <div className="bg-white border border-zinc-200 p-5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Registered Patients</span>
              <div className="p-1 bg-zinc-100 text-zinc-600 rounded border border-zinc-200"><Users className="h-3.5 w-3.5" /></div>
            </div>
            <p className="text-2xl font-black text-zinc-950 font-display">{patients.length}</p>
            <p className="text-[9px] font-mono text-zinc-400">Secure records stored</p>
          </div>
        </div>

        {/* CONTROLS BAR & TABS */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          
          {/* Sub tabs selectors */}
          <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-1">
            <button
              onClick={() => {
                setActiveSubTab("appointments");
                setPatientSearch("");
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "appointments"
                  ? "bg-white text-zinc-950 border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Appointments
            </button>
            <button
              onClick={() => {
                setActiveSubTab("doctors");
                setDoctorSearch("");
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "doctors"
                  ? "bg-white text-zinc-950 border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Specialist Registry
            </button>
            <button
              onClick={() => {
                setActiveSubTab("patients");
                setPatientSearch("");
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "patients"
                  ? "bg-white text-zinc-950 border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Patient Directories
            </button>
            <button
              onClick={() => {
                setActiveSubTab("billing_fees");
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "billing_fees"
                  ? "bg-white text-zinc-950 border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Billing & Fees
            </button>
            <button
              onClick={() => {
                setActiveSubTab("feedbacks");
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "feedbacks"
                  ? "bg-white text-zinc-950 border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Client Feedback ({feedbacksList.length})
            </button>
          </div>

          <div className="p-6 md:p-8">
            
            {/* SUBTAB 1: APPOINTMENTS */}
            {activeSubTab === "appointments" && (
              <div className="space-y-6">
                
                {/* Search & filters panel */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search patient, doctor, special..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                      id="admin-search-input"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Filter className="h-3.5 w-3.5 text-zinc-400" />
                    <select
                      value={appFilter}
                      onChange={(e) => setAppFilter(e.target.value)}
                      className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white w-full sm:w-auto font-bold"
                    >
                      <option value="All Statuses">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Table listings */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="h-6 w-6 border border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-zinc-400 text-xs font-medium">Fetching roster...</p>
                  </div>
                ) : filteredAppointments.length > 0 ? (
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="min-w-full divide-y divide-zinc-200 text-left text-xs md:text-sm">
                      <thead className="bg-zinc-50 font-mono font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                        <tr>
                          <th className="px-5 py-3">Patient Name</th>
                          <th className="px-5 py-3">Doctor / Special</th>
                          <th className="px-5 py-3">Schedule Time</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-zinc-700">
                        {filteredAppointments.map((app) => (
                          <tr key={app.id} className="hover:bg-zinc-50/50">
                            <td className="px-5 py-4 font-semibold text-zinc-950">
                              <div className="font-display text-xs md:text-sm">{app.patientName}</div>
                              <div className="text-[10px] text-zinc-400 font-mono font-normal">{app.patientEmail}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-zinc-900">{app.doctorName}</div>
                              <div className="text-[10px] text-emerald-800 font-mono font-medium">{app.specialty}</div>
                            </td>
                            <td className="px-5 py-4 font-medium">
                              <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-zinc-400" /> {app.date}</div>
                              <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5"><Clock className="h-3.5 w-3.5 text-zinc-400" /> {app.time}</div>
                            </td>
                            <td className="px-5 py-4">
                              {app.status === "pending" && <span className="bg-amber-50 text-amber-800 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-md border border-amber-200 uppercase tracking-wider">Pending</span>}
                              {app.status === "confirmed" && <span className="bg-emerald-50 text-emerald-800 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-md border border-emerald-150 uppercase tracking-wider">Confirmed</span>}
                              {app.status === "completed" && <span className="bg-zinc-100 text-zinc-600 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-md border border-zinc-200 uppercase tracking-wider">Completed</span>}
                              {app.status === "cancelled" && <span className="bg-red-50 text-red-800 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-md border border-red-200 uppercase tracking-wider">Cancelled</span>}
                            </td>
                            <td className="px-5 py-4 text-right space-x-1.5">
                              {app.status === "pending" && (
                                <button
                                  onClick={() => updateAppointmentStatus(app.id, "confirmed")}
                                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  <CheckCircle className="h-3 w-3 text-emerald-400" /> Approve
                                </button>
                              )}
                              {app.status === "confirmed" && (
                                <div className="inline-flex gap-1.5 flex-wrap justify-end">
                                  <button
                                    onClick={() => updateAppointmentStatus(app.id, "completed")}
                                    className="px-2 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-md text-[10px] font-semibold cursor-pointer"
                                  >
                                    Quick Complete
                                  </button>
                                  <button
                                    onClick={() => handleCompleteAndSummarize(app)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-0.5 shadow-sm"
                                  >
                                    <PlusCircle className="h-3 w-3 text-emerald-200" /> Complete & Summarize
                                  </button>
                                </div>
                              )}
                              {app.status !== "cancelled" && app.status !== "completed" && (
                                <button
                                  onClick={() => updateAppointmentStatus(app.id, "cancelled")}
                                  className="px-2.5 py-1 border border-zinc-200 hover:border-red-200 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md text-[10px] font-semibold cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-400 text-xs font-medium">No system appointments found.</div>
                )}

              </div>
            )}

            {/* SUBTAB 2: DOCTOR REGISTRY */}
            {activeSubTab === "doctors" && (
              <div className="space-y-6">
                
                {/* Header operations */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search doctor name or specialty..."
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                      id="doctor-search-admin"
                    />
                  </div>

                  <button
                    onClick={triggerAddDoctor}
                    className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    id="add-doctor-admin-btn"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Register New Doctor</span>
                  </button>
                </div>

                {/* Table lists */}
                {loading ? (
                  <div className="text-center py-12"><div className="h-6 w-6 border border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div></div>
                ) : filteredDoctors.length > 0 ? (
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="min-w-full divide-y divide-zinc-200 text-left text-xs md:text-sm">
                      <thead className="bg-zinc-50 font-mono font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                        <tr>
                          <th className="px-5 py-3">Photo & Name</th>
                          <th className="px-5 py-3">Department</th>
                          <th className="px-5 py-3">Specialty</th>
                          <th className="px-5 py-3">Academic Base</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-zinc-700">
                        {filteredDoctors.map((docProfile) => (
                          <tr key={docProfile.id} className="hover:bg-zinc-50/50">
                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-3">
                                <img src={docProfile.image} alt={docProfile.name} className="h-10 w-10 rounded-lg object-cover border border-zinc-200 bg-zinc-100" />
                                <span className="font-bold text-zinc-900 font-display">{docProfile.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-semibold text-zinc-855">{docProfile.department}</td>
                            <td className="px-5 py-4 text-emerald-800 font-mono font-semibold">{docProfile.specialty}</td>
                            <td className="px-5 py-4 text-zinc-500 text-xs truncate max-w-[200px]" title={docProfile.education}>
                              {docProfile.education}
                            </td>
                            <td className="px-5 py-4 text-right space-x-1.5">
                              <button
                                onClick={() => triggerEditDoctor(docProfile)}
                                className="p-1.5 border border-zinc-200 hover:border-zinc-400 text-zinc-500 hover:text-zinc-900 rounded-lg transition-all cursor-pointer"
                                title="Edit profile"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoctor(docProfile.id)}
                                className="p-1.5 border border-zinc-200 hover:border-red-200 hover:bg-red-50 text-zinc-450 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                                title="Delete profile"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-400 text-xs">No clinicians matching search found.</div>
                )}

              </div>
            )}

            {/* SUBTAB 3: PATIENTS LIST */}
            {activeSubTab === "patients" && (
              <div className="space-y-6">
                
                {/* Search bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search patient registry by name/email..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                    id="patient-search-input"
                  />
                </div>

                {/* Patient Listings table */}
                {loading ? (
                  <div className="text-center py-12"><div className="h-6 w-6 border border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div></div>
                ) : filteredPatients.length > 0 ? (
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="min-w-full divide-y divide-zinc-200 text-left text-xs md:text-sm">
                      <thead className="bg-zinc-50 font-mono font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                        <tr>
                          <th className="px-5 py-3">Patient Identity</th>
                          <th className="px-5 py-3">Email Address</th>
                          <th className="px-5 py-3">Account Opened</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-zinc-700">
                        {filteredPatients.map((pat) => (
                          <tr key={pat.uid} className="hover:bg-zinc-50/50">
                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2.5">
                                <div className="h-8 w-8 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-full flex items-center justify-center font-black uppercase text-xs">
                                  {pat.name.charAt(0)}
                                </div>
                                <span className="font-bold text-zinc-950 font-display">{pat.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-medium text-zinc-600 font-mono text-xs">{pat.email}</td>
                            <td className="px-5 py-4 text-zinc-400 text-xs">
                              {new Date(pat.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => inspectPatient(pat)}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                View Records & Vault
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-450 text-xs">No patient profiles registered.</div>
                )}

              </div>
            )}

            {activeSubTab === "billing_fees" && (
              <div className="space-y-8 animate-fade-in">
                
                {/* 1. GLOBAL FEES SECTION */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-zinc-100 pb-4">
                    <h3 className="text-base font-bold text-zinc-950 font-display flex items-center gap-2">
                      <Hospital className="h-5 w-5 text-emerald-500" />
                      <span>Global Hospital Consultation & Subscription Fees</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans">Set default pricing for clinical consultations and premium health packages</p>
                  </div>

                  {feesSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 flex items-center space-x-2 font-sans">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feesSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateGlobalFees} className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Default Consultation Booking Fee (₦)</label>
                      <input
                        type="number"
                        value={adminBookingFee}
                        onChange={(e) => setAdminBookingFee(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono focus:outline-hidden focus:border-zinc-400 bg-white"
                        placeholder="e.g. 3500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Premium Upgrade Subscription Fee (₦)</label>
                      <input
                        type="number"
                        value={adminPremiumFee}
                        onChange={(e) => setAdminPremiumFee(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono focus:outline-hidden focus:border-zinc-400 bg-white"
                        placeholder="e.g. 500"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 text-right">
                      <button
                        type="submit"
                        disabled={updatingFees}
                        className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-55"
                      >
                        {updatingFees ? "Applying updates..." : "Update Global Fees"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. APPROVED PHARMACY PRICING */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-zinc-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 font-display flex items-center gap-2">
                        <Pill className="h-5 w-5 text-emerald-500" />
                        <span>Approved Pharmacy Catalog & Drug Pricing</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-sans">Manage available therapeutics, symptoms targeting, and retail prices</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMedForm(!showAddMedForm);
                        setAddMedError("");
                        setAddMedSuccess("");
                      }}
                      className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{showAddMedForm ? "Cancel" : "Add Medicine"}</span>
                    </button>
                  </div>

                  {/* Collapsible Add New Medicine Form */}
                  {showAddMedForm && (
                    <form onSubmit={handleAddNewMedicine} className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-4 text-left animate-in fade-in slide-in-from-top-4 duration-200">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-200 pb-2">Add New Formulation to Stock</h4>
                      
                      {addMedSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 font-sans">
                          {addMedSuccess}
                        </div>
                      )}
                      
                      {addMedError && (
                        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-sans">
                          {addMedError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Medicine Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Paracetamol BP 500mg"
                            value={newMedName}
                            onChange={(e) => setNewMedName(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-400"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Price (₦)</label>
                          <input
                            type="number"
                            placeholder="e.g. 1500"
                            value={newMedPrice}
                            onChange={(e) => setNewMedPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white font-mono focus:outline-hidden focus:border-zinc-400"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Sickness Severity Category</label>
                          <select
                            value={newMedCategory}
                            onChange={(e: any) => setNewMedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-400 font-bold"
                          >
                            <option value="mild">Mild (OTC, Pain Relievers, vitamins)</option>
                            <option value="moderate">Moderate (Standard prescriptions, specialized cough syrups)</option>
                            <option value="severe">Severe (Critical anti-hypertensives, specialized antibiotics)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Target Symptoms / Indications (Comma-separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. Fever, Headache, Muscle pain"
                            value={newMedSymptoms}
                            onChange={(e) => setNewMedSymptoms(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-400"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Description & Clinical Usage Guidelines</label>
                          <textarea
                            placeholder="Enter description, frequency directions, food precautions, etc..."
                            value={newMedDescription}
                            onChange={(e) => setNewMedDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddMedForm(false);
                            setAddMedError("");
                          }}
                          className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addingNewMed}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-55"
                        >
                          {addingNewMed ? "Adding formulation..." : "Add to Pharmacy Stock"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="overflow-x-auto border border-zinc-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/50 border-b border-zinc-100">
                          <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Medicine Name</th>
                          <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Sickness Category & Description</th>
                          <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Retail Price</th>
                          <th className="px-5 py-3 text-right text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {adminMedicines.map((med) => (
                          <tr key={med.id} className="hover:bg-zinc-50/50">
                            <td className="px-5 py-4">
                              <span className="font-bold text-zinc-950 text-xs">{med.name}</span>
                              <span className="block text-[9px] font-mono text-zinc-450">{med.id}</span>
                            </td>
                            <td className="px-5 py-4 max-w-sm">
                              <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mb-1">{med.category}</span>
                              <p className="text-xs text-zinc-500 font-sans leading-relaxed">{med.description}</p>
                            </td>
                            <td className="px-5 py-4 font-mono font-bold text-zinc-900 text-xs">
                              ₦{med.price.toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {editingMedicineId === med.id ? (
                                <form onSubmit={handleUpdateMedicinePrice} className="inline-flex flex-col gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-left max-w-xs">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-450 uppercase">Edit Name</label>
                                    <input
                                      type="text"
                                      value={editMedName}
                                      onChange={(e) => setEditMedName(e.target.value)}
                                      className="px-2 py-1 border border-zinc-200 rounded-md text-xs w-full bg-white font-medium"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-450 uppercase">Edit Description</label>
                                    <textarea
                                      value={editMedDesc}
                                      onChange={(e) => setEditMedDesc(e.target.value)}
                                      className="px-2 py-1 border border-zinc-200 rounded-md text-xs w-full bg-white h-12 resize-none"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-450 uppercase">Edit Price (₦)</label>
                                    <input
                                      type="number"
                                      value={editMedPrice}
                                      onChange={(e) => setEditMedPrice(e.target.value)}
                                      className="px-2 py-1 border border-zinc-200 rounded-md text-xs w-full font-mono bg-white"
                                      required
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingMedicineId(null)}
                                      className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-md text-[10px] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={updatingMedicine}
                                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                    >
                                      {updatingMedicine ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingMedicineId(med.id);
                                    setEditMedPrice(med.price);
                                    setEditMedName(med.name);
                                    setEditMedDesc(med.description);
                                  }}
                                  className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  Modify Price / Info
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. PATIENT CUSTOM BILLS MANAGEMENT */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-zinc-100 pb-4">
                    <h3 className="text-base font-bold text-zinc-950 font-display flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-indigo-500" />
                      <span>Custom Clinical Invoicing & Bill Management</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans">Generate, modify, or delete outstanding medical bills for specific patient accounts</p>
                  </div>

                  {billSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 flex items-center space-x-2 font-sans">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{billSuccess}</span>
                    </div>
                  )}

                  {billError && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 flex items-center space-x-2 font-sans">
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{billError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Patient Selector & Form */}
                    <div className="lg:col-span-5 bg-zinc-50/50 p-6 border border-zinc-200 rounded-xl space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Select Patient Profile</label>
                        <select
                          value={selectedBillingPatientId}
                          onChange={(e) => setSelectedBillingPatientId(e.target.value)}
                          className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white font-medium"
                        >
                          <option value="">-- Choose Patient --</option>
                          {patients.map((pat) => (
                            <option key={pat.uid} value={pat.uid}>
                              {pat.name} ({pat.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedBillingPatientId ? (
                        <form onSubmit={handleCreateBill} className="space-y-4 pt-4 border-t border-zinc-200/60">
                          <h4 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">Generate New Medical Invoice</h4>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-zinc-450">Invoice Title / Description</label>
                            <input
                              type="text"
                              value={newBillTitle}
                              onChange={(e) => setNewBillTitle(e.target.value)}
                              placeholder="e.g. Dental scaling & prophylaxis"
                              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-zinc-450">Billing Amount (₦)</label>
                            <input
                              type="number"
                              value={newBillAmount}
                              onChange={(e) => setNewBillAmount(e.target.value)}
                              placeholder="e.g. 5000"
                              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono focus:outline-hidden focus:border-zinc-400 bg-white"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={creatingBill}
                            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 animate-pulse-subtle"
                          >
                            <span>{creatingBill ? "Generating..." : "Register Invoice"}</span>
                          </button>
                        </form>
                      ) : (
                        <div className="text-center py-6 text-zinc-400 text-xs italic bg-white border border-zinc-200/80 rounded-lg">
                          Select a patient profile to manage their billing ledger.
                        </div>
                      )}
                    </div>

                    {/* Right: Selected Patient's Bill ledger list */}
                    <div className="lg:col-span-7 bg-white p-6 border border-zinc-200 rounded-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <h4 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">Account Billing Ledger</h4>
                        <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full">
                          {selectedPatientBills.length} Invoices
                        </span>
                      </div>

                      {loadingBills ? (
                        <div className="text-center py-8 text-xs text-zinc-400">Querying clinical billing files...</div>
                      ) : selectedBillingPatientId ? (
                        selectedPatientBills.length > 0 ? (
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                            {selectedPatientBills.map((bill) => (
                              <div key={bill.id} className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs space-y-3 relative">
                                <div className={`absolute top-0 right-0 h-1 w-12 rounded-bl-xs ${bill.status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`}></div>
                                
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold border uppercase tracking-wider inline-block ${
                                      bill.status === "paid" 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                                        : "bg-amber-50 text-amber-700 border-amber-150"
                                    }`}>
                                      {bill.status}
                                    </span>
                                    <p className="font-bold text-zinc-900 text-sm font-display leading-snug">{bill.title}</p>
                                    <p className="text-[9px] font-mono text-zinc-450">ID: {bill.id} • Created: {new Date(bill.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <span className="font-mono font-black text-zinc-950 text-sm">
                                    ₦{bill.amount.toLocaleString()}
                                  </span>
                                </div>

                                {editingBillId === bill.id ? (
                                  <form onSubmit={handleUpdateBill} className="p-3 bg-white border border-zinc-200 rounded-lg space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-mono text-zinc-400 uppercase">Edit Description</label>
                                      <input
                                        type="text"
                                        value={editBillTitle}
                                        onChange={(e) => setEditBillTitle(e.target.value)}
                                        className="px-2 py-1 border border-zinc-200 rounded-md text-xs w-full bg-white"
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-mono text-zinc-450 uppercase">Edit Fee Amount (₦)</label>
                                      <input
                                        type="number"
                                        value={editBillAmount}
                                        onChange={(e) => setEditBillAmount(e.target.value)}
                                        className="px-2 py-1 border border-zinc-200 rounded-md text-xs w-full font-mono bg-white"
                                        required
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setEditingBillId(null)}
                                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-md text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={updatingBill}
                                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[10px] font-bold"
                                      >
                                        {updatingBill ? "Saving..." : "Save Invoice"}
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex gap-2 justify-end pt-1 border-t border-zinc-100">
                                    <button
                                      onClick={() => {
                                        setEditingBillId(bill.id);
                                        setEditBillAmount(bill.amount);
                                        setEditBillTitle(bill.title);
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 border border-zinc-200 rounded-md cursor-pointer"
                                    >
                                      Change Fee Amount
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBill(bill.id)}
                                      className="px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-md cursor-pointer"
                                    >
                                      Void Invoice
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-xs text-zinc-450 italic bg-zinc-50 border border-zinc-200 rounded-xl">
                            No billing history or unpaid invoices for this patient.
                          </div>
                        )
                      ) : (
                        <div className="text-center py-12 text-xs text-zinc-400 italic bg-zinc-50 border border-zinc-200 rounded-xl">
                          Select a patient to inspect or generate bills.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SUBTAB 5: CLIENT FEEDBACKS */}
            {activeSubTab === "feedbacks" && (
              <div className="space-y-6">
                <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-4">
                  <div className="border-b border-zinc-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 font-display flex items-center gap-2">
                        <Mail className="h-5 w-5 text-emerald-600" />
                        <span>Real-Time Client & Patient Feedback Directory</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-sans mt-0.5">
                        These submissions are also automatically dispatched in real-time to your administrative email: <strong className="text-zinc-850">austineisama150@gmail.com</strong>.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-700 px-3 py-1 rounded-full border border-zinc-200 shrink-0">
                      {feedbacksList.length} Submissions
                    </span>
                  </div>

                  {feedbacksList.length > 0 ? (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                      {feedbacksList.map((fb) => (
                        <div key={fb.id} className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-3 hover:border-zinc-350 transition-all relative">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-extrabold text-zinc-900 text-sm font-display">{fb.subject}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                Submitted by: <strong className="text-zinc-700 font-bold">{fb.name}</strong> (<span className="text-zinc-500 font-medium font-mono">{fb.email}</span>)
                              </p>
                            </div>
                            <span className="text-[9px] font-mono bg-zinc-200/80 text-zinc-650 px-2.5 py-1 rounded-md">
                              {new Date(fb.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="p-4 bg-white border border-zinc-200 rounded-lg text-zinc-700 whitespace-pre-line leading-relaxed text-xs">
                            {fb.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                      <p className="text-zinc-400 font-bold text-sm">No client feedback submitted yet</p>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Once patients submit feedback on the home page form, they will appear here in real-time and dispatch to your email.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* CLINICIAN ADD/EDIT POPUP MODAL */}
        {showDoctorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-xl">
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b border-zinc-100">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 font-display">
                      {editingDoctor ? `Configure ${editingDoctor.name}` : "Add Specialist Clinician"}
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans">Configure clinic wing and academic specifications</p>
                  </div>
                  <button 
                    onClick={() => setShowDoctorModal(false)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 cursor-pointer text-base font-bold leading-none h-7 w-7 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {/* Form Alerts */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-sans">
                    {modalError}
                  </div>
                )}

                {modalSuccess && (
                  <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 font-sans">
                    {modalSuccess}
                  </div>
                )}

                {/* Form layout */}
                <form onSubmit={handleSubmitDoctorForm} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Arthur Pendragon"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Specialty */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g. Pediatric Surgeon"
                      value={docSpecialty}
                      onChange={(e) => setDocSpecialty(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Dept selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Department Wing</label>
                    <select
                      value={docDept}
                      onChange={(e) => setDocDept(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>

                  {/* Experience */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Years of Experience</label>
                    <input
                      type="text"
                      placeholder="e.g. 15 years"
                      value={docExp}
                      onChange={(e) => setDocExp(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Education */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Education Details</label>
                    <input
                      type="text"
                      placeholder="e.g. M.D. Oxford Medical School"
                      value={docEdu}
                      onChange={(e) => setDocEdu(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Rating */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Initial Rating (1 - 5)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={docRating}
                      onChange={(e) => setDocRating(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Photo URL</label>
                    <input
                      type="text"
                      placeholder="Unsplash URL"
                      value={docImg}
                      onChange={(e) => setDocImg(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Clinical Bio / Summary</label>
                    <textarea
                      placeholder="Describe medical expertise and accomplishments..."
                      value={docBio}
                      onChange={(e) => setDocBio(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-450"
                      required
                    />
                  </div>

                  {/* Footer CTAs */}
                  <div className="sm:col-span-2 flex justify-end gap-3 border-t border-zinc-150 pt-5 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDoctorModal(false)}
                      className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                    >
                      {modalLoading ? "Saving..." : "Save clinician"}
                    </button>
                  </div>

                </form>

              </div>
            </div>
          </div>
        )}

        {/* PATIENT RECORD INSPECTOR POPUP */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-xl">
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b border-zinc-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-full flex items-center justify-center font-black uppercase font-display">
                      {selectedPatient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 font-display">{selectedPatient.name}</h3>
                      <p className="text-[10px] font-mono text-zinc-400">Registered: {new Date(selectedPatient.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 h-7 w-7 flex items-center justify-center cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                </div>

                {inspectorLoading ? (
                  <div className="text-center py-8"><div className="h-6 w-6 border border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                ) : (
                  <div className="space-y-8">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Patient appointments */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-zinc-550" />
                          <span>Scheduled Visits ({patientAppointments.length})</span>
                        </h4>
                        {patientAppointments.length > 0 ? (
                          <div className="space-y-2.5 max-h-60 overflow-y-auto">
                            {patientAppointments.map((app) => (
                              <div key={app.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-zinc-950 font-display">{app.doctorName}</span>
                                  <span className="text-[9px] uppercase font-mono font-bold text-zinc-450">{app.status}</span>
                                </div>
                                <p className="text-zinc-650 font-medium font-sans">{app.date} • {app.time}</p>
                                {app.notes && <p className="text-[10px] text-zinc-500 italic">"Notes: {app.notes}"</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 font-medium py-3 bg-zinc-50 rounded-lg text-center border border-zinc-150">No appointments requested.</p>
                        )}
                      </div>

                      {/* Patient reports */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-zinc-550" />
                          <span>Clinical Diagnostic Vault ({patientReports.length})</span>
                        </h4>
                        {patientReports.length > 0 ? (
                          <div className="space-y-2.5 max-h-60 overflow-y-auto">
                            {patientReports.map((rep) => (
                              <div key={rep.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs flex justify-between items-center gap-3">
                                <div className="truncate space-y-0.5">
                                  <p className="font-bold text-zinc-900 truncate font-display" title={rep.title}>{rep.title}</p>
                                  <p className="text-[9px] text-zinc-450 truncate font-mono">{rep.fileName}</p>
                                </div>
                                <a
                                  href={rep.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-md border border-zinc-200 shrink-0 text-[10px]"
                                >
                                  View File
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 font-medium py-3 bg-zinc-50 rounded-lg text-center border border-zinc-150">No reports uploaded.</p>
                        )}
                      </div>

                    </div>

                    {/* Divider */}
                    <div className="border-t border-zinc-250/70 pt-6"></div>

                    {/* Patient Medical History Section */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-150">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5 font-display">
                            <HeartPulse className="h-4.5 w-4.5 text-red-500" />
                            <span>Patient Medical History & Diagnoses</span>
                          </h4>
                          <p className="text-xs text-zinc-500 font-sans">Official and self-reported medical timeline for {selectedPatient.name}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {inspectedMedHistory?.pastVisits?.length || 0} Visits Saved
                        </span>
                      </div>

                      {/* Display declared attributes */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-zinc-50 p-3 border border-zinc-200 rounded-lg space-y-1">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">Blood Type</span>
                          <p className="text-xs font-bold text-zinc-800">{inspectedMedHistory?.bloodType || "Not specified"}</p>
                        </div>
                        <div className="bg-zinc-50 p-3 border border-zinc-200 rounded-lg space-y-1">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold text-red-500">Allergies (Verified)</span>
                          <p className="text-xs font-bold text-zinc-800 truncate" title={inspectedMedHistory?.allergies?.join(", ")}>
                            {inspectedMedHistory?.allergies?.join(", ") || "No allergies declared"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 p-3 border border-zinc-200 rounded-lg space-y-1 col-span-1">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">Chronic Conditions</span>
                          <p className="text-xs font-bold text-zinc-800 truncate" title={inspectedMedHistory?.chronicConditions?.join(", ")}>
                            {inspectedMedHistory?.chronicConditions?.join(", ") || "No conditions declared"}
                          </p>
                        </div>
                      </div>

                      {/* Physical Profile Metrics for Admin/Doctors to use */}
                      <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg space-y-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block pb-1 border-b border-zinc-200">Patient Declared Physical Profile</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[9px] font-mono uppercase text-zinc-400">Height</span>
                            <p className="text-xs font-bold text-zinc-800">{inspectedMedHistory?.height ? `${inspectedMedHistory.height} cm` : "Not declared"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono uppercase text-zinc-400">Weight</span>
                            <p className="text-xs font-bold text-zinc-800">{inspectedMedHistory?.weight ? `${inspectedMedHistory.weight} kg` : "Not declared"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono uppercase text-zinc-400">Blood Pressure</span>
                            <p className="text-xs font-bold text-zinc-800">{inspectedMedHistory?.bloodPressure || "Not declared"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono uppercase text-zinc-400">Heart Rate</span>
                            <p className="text-xs font-bold text-zinc-800">{inspectedMedHistory?.heartRate ? `${inspectedMedHistory.heartRate} bpm` : "Not declared"}</p>
                          </div>
                        </div>
                        {inspectedMedHistory?.additionalNotes && (
                          <div className="pt-2 border-t border-zinc-200/60">
                            <span className="text-[9px] font-mono uppercase text-zinc-400">Additional Health/Clinical Notes</span>
                            <p className="text-xs text-zinc-700 leading-relaxed italic">{inspectedMedHistory.additionalNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* past visits log list */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Recorded Consultation Summaries</span>
                        {inspectedMedHistory?.pastVisits && inspectedMedHistory.pastVisits.length > 0 ? (
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {inspectedMedHistory.pastVisits.map((visit) => (
                              <div key={visit.id} className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-xs space-y-2 relative">
                                <div className="absolute top-0 right-0 h-1 bg-emerald-500 w-12 rounded-bl-sm"></div>
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-zinc-900 font-display">{visit.doctorName} ({visit.specialty})</span>
                                  <span className="text-[9px] font-mono text-zinc-450">{visit.date}</span>
                                </div>
                                <p className="text-zinc-700 font-medium font-sans"><strong>Reason:</strong> {visit.reason}</p>
                                <p className="text-zinc-650 bg-white p-2.5 rounded-md border border-zinc-150 leading-relaxed font-sans">{visit.summary}</p>
                                {visit.prescription && (
                                  <div className="text-xs text-amber-800 font-mono italic bg-amber-50/30 p-2 rounded-md border border-amber-200/50">
                                    <strong className="text-[9px] uppercase tracking-wider font-bold block mb-0.5 text-amber-700">Active Rx Prescription:</strong>
                                    {visit.prescription}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 font-medium py-3 bg-zinc-50 rounded-lg text-center border border-zinc-150">
                            No past visit summaries recorded yet for {selectedPatient.name}. Use the form below to add a record.
                          </p>
                        )}
                      </div>

                      {/* Add new PastVisit form */}
                      <div className="bg-zinc-50/70 p-5 rounded-xl border border-zinc-200 space-y-4">
                        <div className="pb-2 border-b border-zinc-200">
                          <h5 className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-wider">Log New Patient Visit Summary</h5>
                          <p className="text-[11px] text-zinc-500 font-sans">Add official diagnosis summaries and prescriptions</p>
                        </div>

                        {newVisitSuccess && (
                          <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 font-sans">
                            {newVisitSuccess}
                          </div>
                        )}

                        {newVisitError && (
                          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-sans">
                            {newVisitError}
                          </div>
                        )}

                        <form onSubmit={handleAddVisitEntry} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* Physician Name & Specialty */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Consulting Physician Name</label>
                            <select
                              value={newVisitDoctorName}
                              onChange={(e) => {
                                setNewVisitDoctorName(e.target.value);
                                // Set corresponding specialty auto-convenience
                                const selectedDoc = doctors.find(d => d.name === e.target.value);
                                if (selectedDoc) {
                                  setNewVisitSpecialty(selectedDoc.specialty);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden"
                              required
                            >
                              <option value="">-- Select Physician --</option>
                              {doctors.map((d) => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Physician Specialty</label>
                            <input
                              type="text"
                              placeholder="e.g. Cardiologist"
                              value={newVisitSpecialty}
                              onChange={(e) => setNewVisitSpecialty(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden"
                            />
                          </div>

                          {/* Consultation Date & Reason */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Consultation Date</label>
                            <input
                              type="date"
                              value={newVisitDate}
                              onChange={(e) => setNewVisitDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Consultation Reason / Symptoms</label>
                            <input
                              type="text"
                              placeholder="e.g. High blood pressure checkup, annual physical"
                              value={newVisitReason}
                              onChange={(e) => setNewVisitReason(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden"
                              required
                            />
                          </div>

                          {/* Assessment Summary */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Clinical Summary / Findings</label>
                            <textarea
                              placeholder="Describe your patient physical assessment findings, recommended therapy steps, or diagnoses..."
                              value={newVisitSummary}
                              onChange={(e) => setNewVisitSummary(e.target.value)}
                              rows={3}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden"
                              required
                            />
                          </div>

                          {/* Rx Prescription */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Active Prescriptions / Drugs (Rx - Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Lisinopril 10mg once daily"
                              value={newVisitPrescription}
                              onChange={(e) => setNewVisitPrescription(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-hidden"
                            />
                          </div>

                          {/* Submit */}
                          <div className="sm:col-span-2 flex justify-end">
                            <button
                              type="submit"
                              disabled={savingVisit}
                              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer disabled:bg-zinc-400"
                            >
                              <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{savingVisit ? "Saving Entry..." : "Save Visit Summary"}</span>
                            </button>
                          </div>

                        </form>
                      </div>

                    </div>

                  </div>
                )}

                {/* Footer close */}
                <div className="flex justify-end border-t border-zinc-100 pt-5">
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Close Inspection
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
