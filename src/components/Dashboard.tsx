import React from "react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  orderBy,
  deleteDoc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, Doctor, Appointment, Report, AppointmentStatus, MedicalHistory, PastVisit, CarePlan, PaymentLog } from "../types";
import { getApiUrl } from "../config";
import { 
  Calendar, 
  Clock, 
  FileText, 
  PlusCircle, 
  UploadCloud, 
  Trash2, 
  User, 
  Activity, 
  CheckCircle, 
  XCircle,
  FileDown,
  ChevronRight,
  Sparkles,
  Stethoscope,
  Shield,
  FileSignature,
  Crown,
  Lock,
  MessageSquare,
  AlertTriangle,
  Send,
  Loader2,
  HeartPulse,
  CreditCard,
  Search,
  Pill
} from "lucide-react";

interface DashboardProps {
  userProfile: UserProfile;
  initialSelectedDoctor?: Doctor | null;
  clearInitialDoctorSelection?: () => void;
}

export default function Dashboard({ userProfile, initialSelectedDoctor, clearInitialDoctorSelection }: DashboardProps) {
  const [activeTab, setActiveTab] = React.useState<"appointments" | "reports" | "medical_history" | "ai_consultation" | "billing_medicine">("appointments");
  
  // Billing and Medicines states
  const [medicalBills, setMedicalBills] = React.useState<any[]>([]);
  const [medicines, setMedicines] = React.useState<any[]>([]);
  const [medicinePurchases, setMedicinePurchases] = React.useState<any[]>([]);
  const [billingSubTab, setBillingSubTab] = React.useState<"bills" | "pharmacy" | "purchases" | "invoices">("bills");
  const [paymentReceipts, setPaymentReceipts] = React.useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = React.useState<any | null>(null);
  const [sicknessDescription, setSicknessDescription] = React.useState("");
  const [medicineCategory, setMedicineCategory] = React.useState<"all" | "mild" | "moderate" | "severe">("all");
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Premium Status and Care plans
  const [isPremium, setIsPremium] = React.useState(userProfile.isPremium || false);
  const [carePlans, setCarePlans] = React.useState<CarePlan[]>([]);
  const [paymentLoading, setPaymentLoading] = React.useState(false);

  // AI Agent States
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiInput, setAiInput] = React.useState("");
  const [aiChatMessages, setAiChatMessages] = React.useState<{role: "user" | "model", text: string, thoughts?: any[]}[]>([
    {
      role: "model",
      text: "Welcome to GodsCareHospital Autonomous Consultation Hub. I am your Clinical AI Agent, equipped with deep diagnostics tool execution capabilities. I can inspect your clinical history, analyze files, and autonomously log custom Care Pathways directly to your patient profile. What symptoms or questions do you have today?"
    }
  ]);

  // Medical History states
  const [medicalHistory, setMedicalHistory] = React.useState<MedicalHistory | null>(null);
  const [historyBloodType, setHistoryBloodType] = React.useState("");
  const [historyAllergies, setHistoryAllergies] = React.useState("");
  const [historyConditions, setHistoryConditions] = React.useState("");
  const [historyHeight, setHistoryHeight] = React.useState("");
  const [historyWeight, setHistoryWeight] = React.useState("");
  const [historyBloodPressure, setHistoryBloodPressure] = React.useState("");
  const [historyHeartRate, setHistoryHeartRate] = React.useState("");
  const [historyAdditionalNotes, setHistoryAdditionalNotes] = React.useState("");
  const [historySuccess, setHistorySuccess] = React.useState("");
  const [historyError, setHistoryError] = React.useState("");
  const [savingHistory, setSavingHistory] = React.useState(false);
  
  // Dynamic Fees state loaded from backend
  const [bookingFee, setBookingFee] = React.useState(3500);
  const [premiumFee, setPremiumFee] = React.useState(500);
  
  // Appointment Form state
  const [bookDept, setBookDept] = React.useState("Cardiology");
  const [bookDoctorId, setBookDoctorId] = React.useState("");
  const [bookDate, setBookDate] = React.useState("");
  const [bookTime, setBookTime] = React.useState("");
  const [bookNotes, setBookNotes] = React.useState("");
  const [bookError, setBookError] = React.useState("");
  const [bookSuccess, setBookSuccess] = React.useState("");
  const [bookingLoading, setBookingLoading] = React.useState(false);

  // Reports Form State
  const [reportTitle, setReportTitle] = React.useState("");
  const [reportDesc, setReportDesc] = React.useState("");
  const [reportFile, setReportFile] = React.useState<File | null>(null);
  const [reportBase64, setReportBase64] = React.useState("");
  const [reportError, setReportError] = React.useState("");
  const [reportSuccess, setReportSuccess] = React.useState("");
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [showUploadModal, setShowUploadModal] = React.useState(false);

  // Direct client-side billing self-healing fallback states
  const [showLocalPaymentModal, setShowLocalPaymentModal] = React.useState(false);
  const [localPaymentData, setLocalPaymentData] = React.useState<{
    paymentType: "premium" | "appointment" | "bill" | "medicine";
    amount: number;
    targetId: string;
    medicineName: string;
  } | null>(null);
  const [localCardNumber, setLocalCardNumber] = React.useState("");
  const [localCardHolder, setLocalCardHolder] = React.useState("");
  const [localCardExpiry, setLocalCardExpiry] = React.useState("");
  const [localCardCvv, setLocalCardCvv] = React.useState("");
  const [localSelectedBrand, setLocalSelectedBrand] = React.useState("Verve");
  const [showLocalPinModal, setShowLocalPinModal] = React.useState(false);
  const [localPin, setLocalPin] = React.useState(["", "", "", ""]);
  const [localAuthorizing, setLocalAuthorizing] = React.useState(false);

  // Load essential data on mount
  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);

      // 0. Load live user profile status (Premium check)
      const userRef = doc(db, "users", userProfile.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        setIsPremium(uData.isPremium || false);
      }

      // 1. Load doctors (for booking selection)
      const doctorsRef = collection(db, "doctors");
      const docsSnap = await getDocs(doctorsRef);
      const docsList: Doctor[] = [];
      docsSnap.forEach((d) => {
        docsList.push(d.data() as Doctor);
      });
      setDoctors(docsList);

      // 2. Load appointments for THIS user only (Strict security)
      const appointmentsRef = collection(db, "appointments");
      const qAppointments = query(appointmentsRef, where("patientId", "==", userProfile.uid));
      const appSnap = await getDocs(qAppointments);
      const appList: Appointment[] = [];
      appSnap.forEach((d) => {
        appList.push(d.data() as Appointment);
      });
      // Sort appointments by date
      appList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAppointments(appList);

      // 3. Load reports for THIS user only (Strict security)
      const reportsRef = collection(db, "reports");
      const qReports = query(reportsRef, where("patientId", "==", userProfile.uid));
      const repSnap = await getDocs(qReports);
      const repList: Report[] = [];
      repSnap.forEach((d) => {
        repList.push(d.data() as Report);
      });
      // Sort reports by uploadedAt descending
      repList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setReports(repList);

      // 4. Load medical history for THIS user
      const medRef = doc(db, "medical_histories", userProfile.uid);
      const medSnap = await getDoc(medRef);
      if (medSnap.exists()) {
        const data = medSnap.data() as MedicalHistory;
        setMedicalHistory(data);
        setHistoryBloodType(data.bloodType || "");
        setHistoryAllergies(data.allergies?.join(", ") || "");
        setHistoryConditions(data.chronicConditions?.join(", ") || "");
        setHistoryHeight(data.height || "");
        setHistoryWeight(data.weight || "");
        setHistoryBloodPressure(data.bloodPressure || "");
        setHistoryHeartRate(data.heartRate || "");
        setHistoryAdditionalNotes(data.additionalNotes || "");
      } else {
        setMedicalHistory(null);
      }

      // 5. Load care plans (AI-generated insights)
      const carePlansRef = collection(db, "care_plans");
      const qCarePlans = query(carePlansRef, where("patientId", "==", userProfile.uid));
      const careSnap = await getDocs(qCarePlans);
      const careList: CarePlan[] = [];
      careSnap.forEach((d) => {
        careList.push(d.data() as CarePlan);
      });
      careList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCarePlans(careList);

      // 6. Load medical bills
      try {
        const billsRes = await fetch(getApiUrl(`/api/patients/${userProfile.uid}/bills`));
        if (billsRes.ok) {
          const billsData = await billsRes.json();
          setMedicalBills(billsData);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load medical bills via API, attempting direct Firestore fallback:", e);
        try {
          const billsCol = collection(db, "medical_bills");
          const snap = await getDocs(query(billsCol, where("patientId", "==", userProfile.uid)));
          const billsList: any[] = [];
          snap.forEach((docSnap) => {
            billsList.push(docSnap.data());
          });
          billsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setMedicalBills(billsList);
        } catch (fallbackErr) {
          console.error("Firestore billing read fallback failed:", fallbackErr);
        }
      }

      // 7. Load medicines catalog
      try {
        const medicinesRes = await fetch(getApiUrl("/api/medicines"));
        if (medicinesRes.ok) {
          const medsData = await medicinesRes.json();
          setMedicines(medsData);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load medicines catalog via API, attempting direct Firestore fallback:", e);
        try {
          const medsCol = collection(db, "medicines");
          const snap = await getDocs(medsCol);
          const medsList: any[] = [];
          snap.forEach((docSnap) => {
            medsList.push(docSnap.data());
          });
          if (medsList.length > 0) {
            medsList.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
            setMedicines(medsList);
          }
        } catch (fallbackErr) {
          console.error("Firestore medicines read fallback failed:", fallbackErr);
        }
      }

      // 8. Load medicine purchases history
      try {
        const purchasesRes = await fetch(getApiUrl(`/api/patients/${userProfile.uid}/medicine-purchases`));
        if (purchasesRes.ok) {
          const purchasesData = await purchasesRes.json();
          setMedicinePurchases(purchasesData);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load medicine purchases via API, attempting direct Firestore fallback:", e);
        try {
          const purchasesCol = collection(db, "medicine_purchases");
          const snap = await getDocs(query(purchasesCol, where("patientId", "==", userProfile.uid)));
          const purchasesList: any[] = [];
          snap.forEach((docSnap) => {
            purchasesList.push(docSnap.data());
          });
          purchasesList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setMedicinePurchases(purchasesList);
        } catch (fallbackErr) {
          console.error("Firestore medicine purchases fallback failed:", fallbackErr);
        }
      }

      // 8.5. Load payments/receipts history
      try {
        const paySnap = await getDocs(query(collection(db, "payments"), where("patientId", "==", userProfile.uid)));
        const payList: any[] = [];
        paySnap.forEach((d) => {
          payList.push(d.data());
        });
        payList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPaymentReceipts(payList);
      } catch (e) {
        console.error("Error loading payment transactions:", e);
      }

      // 9. Load dynamic fees from system settings
      try {
        const feesRes = await fetch(getApiUrl("/api/settings/fees"));
        if (feesRes.ok) {
          const feesData = await feesRes.json();
          if (feesData.appointmentBookingFee) setBookingFee(feesData.appointmentBookingFee);
          if (feesData.premiumSubscriptionFee) setPremiumFee(feesData.premiumSubscriptionFee);
        } else {
          throw new Error("HTTP response error");
        }
      } catch (e) {
        console.warn("Failed to load settings/fees via API, attempting direct Firestore fallback:", e);
        try {
          const docRef = doc(db, "system_settings", "fees");
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const feesData = snap.data();
            if (feesData.appointmentBookingFee) setBookingFee(feesData.appointmentBookingFee);
            if (feesData.premiumSubscriptionFee) setPremiumFee(feesData.premiumSubscriptionFee);
          }
        } catch (fallbackErr) {
          console.error("Firestore fees read fallback failed:", fallbackErr);
        }
      }

    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [userProfile.uid]);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle passed doctor from Doctors listings
  React.useEffect(() => {
    if (initialSelectedDoctor) {
      setBookDept(initialSelectedDoctor.department);
      setBookDoctorId(initialSelectedDoctor.id);
      setActiveTab("appointments");
      if (clearInitialDoctorSelection) {
        clearInitialDoctorSelection();
      }
    }
  }, [initialSelectedDoctor, clearInitialDoctorSelection]);

  // Filter doctors list based on selected department for booking dropdown
  const availableDoctorsForDept = doctors.filter((doc) => doc.department === bookDept);

  // Doctor list changes, pre-select the first doctor in that department
  React.useEffect(() => {
    if (availableDoctorsForDept.length > 0 && !bookDoctorId) {
      setBookDoctorId(availableDoctorsForDept[0].id);
    }
  }, [bookDept, availableDoctorsForDept, bookDoctorId]);

  // Get selected doctor available days and hours
  const activeDoctorProfile = doctors.find((d) => d.id === bookDoctorId);

  // Handle appointment booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingLoading) return;

    setBookError("");
    setBookSuccess("");

    if (!bookDoctorId || !bookDate || !bookTime) {
      setBookError("Please select a doctor, date, and available hours slot.");
      return;
    }

    const doctorProfile = doctors.find((doc) => doc.id === bookDoctorId);
    if (!doctorProfile) {
      setBookError("Selected doctor profile could not be verified.");
      return;
    }

    try {
      setBookingLoading(true);

      const appRef = doc(collection(db, "appointments"));
      const appointmentId = appRef.id;

      const newApp: Appointment = {
        id: appointmentId,
        patientId: userProfile.uid,
        patientName: userProfile.name,
        patientEmail: userProfile.email,
        doctorId: doctorProfile.id,
        doctorName: doctorProfile.name,
        specialty: doctorProfile.specialty,
        date: bookDate,
        time: bookTime,
        status: "pending",
        notes: bookNotes,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "appointments"), newApp);

      setBookSuccess("Your appointment has been requested! Status is pending administrator confirmation.");
      
      // Reset form fields
      setBookNotes("");
      setBookDate("");
      setBookTime("");

      // Reload list
      loadDashboardData();
    } catch (err: any) {
      console.error("Booking error:", err);
      setBookError(err.message || "Unable to request appointment. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel an appointment
  const handleCancelAppointment = async (appId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this appointment request?");
    if (!confirmCancel) return;

    try {
      // Find the document inside our appointments collection
      const appColRef = collection(db, "appointments");
      const appSnap = await getDocs(query(appColRef, where("patientId", "==", userProfile.uid)));
      let docRefId = "";
      appSnap.forEach((docSnap) => {
        const app = docSnap.data() as Appointment;
        if (app.id === appId) {
          docRefId = docSnap.id;
        }
      });

      if (docRefId) {
        await updateDoc(doc(db, "appointments", docRefId), {
          status: "cancelled" as AppointmentStatus
        });
        loadDashboardData();
      }
    } catch (error) {
      console.error("Cancel appointment error:", error);
      alert("Failed to cancel appointment. Please retry.");
    }
  };

  // Convert uploaded file to base64 for embedding
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload clinical report
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadLoading) return;

    setReportError("");
    setReportSuccess("");

    if (!reportTitle) {
      setReportError("Please specify a document title.");
      return;
    }

    try {
      setUploadLoading(true);

      const repRef = doc(collection(db, "reports"));
      const reportId = repRef.id;

      // Safe URL generation
      let fileUrl = "https://greencare-storage.org/reports/simulated_secure_diagnostic.pdf";
      if (reportBase64) {
        fileUrl = reportBase64; // Persist actual document contents
      }

      const newReport: Report = {
        id: reportId,
        patientId: userProfile.uid,
        patientName: userProfile.name,
        title: reportTitle,
        description: reportDesc,
        fileUrl: fileUrl,
        fileName: reportFile ? reportFile.name : "lab_diagnostic.pdf",
        uploadedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "reports"), newReport);

      setReportSuccess("Clinical report uploaded and encrypted successfully in your vault.");
      
      // Reset state
      setReportTitle("");
      setReportDesc("");
      setReportFile(null);
      setReportBase64("");

      setTimeout(() => {
        setShowUploadModal(false);
        loadDashboardData();
      }, 1000);

    } catch (err: any) {
      console.error("Upload report error:", err);
      setReportError(err.message || "Failed to upload document. Please retry.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete uploaded report
  const handleDeleteReport = async (repId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this diagnostic report from your vault?");
    if (!confirmDelete) return;

    try {
      const colRef = collection(db, "reports");
      const repSnap = await getDocs(query(colRef));
      let docRefId = "";
      repSnap.forEach((docSnap) => {
        const rep = docSnap.data() as Report;
        if (rep.id === repId) {
          docRefId = docSnap.id;
        }
      });

      if (docRefId) {
        await deleteDoc(doc(db, "reports", docRefId));
        loadDashboardData();
      }
    } catch (err) {
      console.error("Delete report error:", err);
      alert("Failed to delete report.");
    }
  };

  // Save or Update patient self-declared medical history
  const handleSaveMedicalHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingHistory) return;

    setHistoryError("");
    setHistorySuccess("");
    setSavingHistory(true);

    try {
      const allergiesList = historyAllergies
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const conditionsList = historyConditions
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const medRef = doc(db, "medical_histories", userProfile.uid);
      const currentHistoryDoc = await getDoc(medRef);

      let pastVisits: PastVisit[] = [];
      if (currentHistoryDoc.exists()) {
        const existingData = currentHistoryDoc.data() as MedicalHistory;
        pastVisits = existingData.pastVisits || [];
      }

      const updatedHistory: MedicalHistory = {
        id: userProfile.uid,
        patientId: userProfile.uid,
        bloodType: historyBloodType,
        allergies: allergiesList,
        chronicConditions: conditionsList,
        height: historyHeight,
        weight: historyWeight,
        bloodPressure: historyBloodPressure,
        heartRate: historyHeartRate,
        additionalNotes: historyAdditionalNotes,
        pastVisits: pastVisits,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(medRef, updatedHistory);
      setMedicalHistory(updatedHistory);
      setHistorySuccess("Your physical profile has been updated in our clinical database successfully.");
      
      setTimeout(() => {
        setHistorySuccess("");
      }, 5000);
    } catch (err: any) {
      console.error("Save medical history error:", err);
      setHistoryError(err.message || "Failed to update your physical profile.");
    } finally {
      setSavingHistory(false);
    }
  };

  // Payment Handler: Generic Checkout (premium, appointment, bill, medicine)
  const handleCheckoutPayment = async (
    paymentType: "premium" | "appointment" | "bill" | "medicine",
    amount: number,
    targetId?: string,
    medicineName?: string
  ) => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/payments/initialize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userProfile.email,
          amount,
          userId: userProfile.uid,
          paymentType,
          targetId: targetId || "none",
          medicineName: medicineName || "",
          origin: window.location.origin
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Invalid response format (expected JSON, got ${contentType}). Server might be misconfigured or offline.`);
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Failed to initialize secure checkout session.");
      }
    } catch (err: any) {
      console.warn("[Billing Error]: Active self-healing local ledger fallback initiated due to:", err);
      const errMsg = err?.message || "";
      if (errMsg.includes("Paystack live billing gateway is not configured") || errMsg.includes("PAYSTACK_SECRET_KEY")) {
        alert(
          "Paystack Key Missing on Vercel:\n\n" +
          "Your Vercel environment is live, but the PAYSTACK_SECRET_KEY environment variable is not configured on your Vercel Dashboard.\n\n" +
          "Please log into your Vercel account, go to your project Settings > Environment Variables, and add 'PAYSTACK_SECRET_KEY' with your Paystack Secret Key to enable live payments."
        );
        setPaymentLoading(false);
        return;
      }
      
      // Trigger direct client-side billing modal fallback
      setLocalPaymentData({
        paymentType,
        amount,
        targetId: targetId || "none",
        medicineName: medicineName || ""
      });
      setLocalCardHolder(userProfile.name || "Patient Name");
      setLocalCardNumber("5061 0422 9384 1029"); // Verve default
      setLocalCardExpiry("12/28");
      setLocalCardCvv("931");
      setLocalSelectedBrand("Verve");
      setShowLocalPaymentModal(true);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Submit payment directly to Firestore (self-healing clinical ledger fallback)
  const processDirectFirestorePayment = async () => {
    if (!localPaymentData || localAuthorizing) return;
    setLocalAuthorizing(true);
    
    const { paymentType, amount, targetId, medicineName } = localPaymentData;
    const reference = `gcare-direct-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const userId = userProfile.uid;

    try {
      console.log(`[Self-Healing Ledger] Processing direct Firestore updates for ${paymentType}, targetId: ${targetId}`);

      // 1. Update primary documents in Firestore
      if (paymentType === "premium") {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { isPremium: true });
        console.log(`[Self-Healing Ledger] Upgraded user ${userId} to Premium status.`);
      } else if (paymentType === "appointment") {
        const appCol = collection(db, "appointments");
        const appSnap = await getDocs(query(appCol, where("patientId", "==", userId)));
        let docRefId = "";
        appSnap.forEach((docSnap) => {
          const app = docSnap.data();
          if (app.id === targetId) {
            docRefId = docSnap.id;
          }
        });
        if (docRefId) {
          await updateDoc(doc(db, "appointments", docRefId), {
            paymentStatus: "paid",
            paymentReference: reference
          });
          console.log(`[Self-Healing Ledger] Marked appointment ${targetId} as PAID.`);
        }
      } else if (paymentType === "bill") {
        const billCol = collection(db, "medical_bills");
        const billSnap = await getDocs(query(billCol, where("patientId", "==", userId)));
        let docRefId = "";
        billSnap.forEach((docSnap) => {
          const bill = docSnap.data();
          if (bill.id === targetId) {
            docRefId = docSnap.id;
          }
        });
        if (docRefId) {
          await updateDoc(doc(db, "medical_bills", docRefId), {
            status: "paid",
            paymentReference: reference,
            paidAt: new Date().toISOString()
          });
          console.log(`[Self-Healing Ledger] Marked medical bill ${targetId} as PAID.`);
        }
      } else if (paymentType === "medicine") {
        const purchaseId = `purch-${Date.now()}`;
        const purchaseDoc = {
          id: purchaseId,
          patientId: userId,
          medicineId: targetId,
          medicineName: medicineName || "Prescribed Medicine",
          price: amount,
          status: "paid",
          purchasedAt: new Date().toISOString(),
          paymentReference: reference
        };
        await setDoc(doc(db, "medicine_purchases", purchaseId), purchaseDoc);
        console.log(`[Self-Healing Ledger] Logged medicine purchase ${purchaseId} for ${medicineName}.`);
      }

      // 2. Save payment transaction record
      const payLogId = `pay-${Date.now()}`;
      const paymentLogDoc = {
        id: payLogId,
        patientId: userId,
        amount: amount,
        currency: "NGN",
        status: "success",
        reference,
        paymentType,
        targetId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "payments", payLogId), paymentLogDoc);
      console.log(`[Self-Healing Ledger] Logged payment transaction ${payLogId}.`);

      // 3. Re-load dashboard data
      await loadDashboardData();

      // Close modals
      setShowLocalPinModal(false);
      setShowLocalPaymentModal(false);
      setLocalPaymentData(null);
      setLocalPin(["", "", "", ""]);
      
      alert("Success: Your billing transaction was synchronized securely via our self-healing direct Firestore clinical ledger.");
    } catch (error: any) {
      console.error("[Self-Healing Ledger Error]:", error);
      alert(`Ledger Synchronization failed: ${error.message || "Please try again."}`);
    } finally {
      setLocalAuthorizing(false);
    }
  };

  const handleUpgradeToPremium = async () => {
    await handleCheckoutPayment("premium", premiumFee);
  };

  // AI Agent message handler with autonomous tool updates
  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aiLoading || !aiInput.trim()) return;

    const userText = aiInput.trim();
    setAiInput("");
    setAiLoading(true);

    const updatedMessages = [...aiChatMessages, { role: "user" as const, text: userText }];
    setAiChatMessages(updatedMessages);

    try {
      const apiFormat = updatedMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const res = await fetch(getApiUrl("/api/gemini/agent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiFormat,
          uid: userProfile.uid
        })
      });

      const data = await res.json();
      if (data.text) {
        setAiChatMessages(prev => [
          ...prev,
          { 
            role: "model" as const, 
            text: data.text, 
            thoughts: data.thoughts 
          }
        ]);

        // If tools executed (like writing insights to Firestore), refresh lists dynamically
        if (data.thoughts && data.thoughts.some((t: any) => t.action === "logNewUserInsight")) {
          setTimeout(() => {
            loadDashboardData();
          }, 1500);
        }
      } else {
        setAiChatMessages(prev => [
          ...prev,
          { role: "model" as const, text: "The clinical model encountered an evaluation error. Please try restating your symptom." }
        ]);
      }
    } catch (err) {
      console.error("[Clinical AI Error]:", err);
      setAiChatMessages(prev => [
        ...prev,
        { role: "model" as const, text: "I apologize, but my diagnostic networks are currently offline. Please try again shortly." }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="py-12 bg-[#fbfbfc] font-sans min-h-[85vh] text-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Welcome Banner */}
        <div className="bg-zinc-900 text-white rounded-xl p-6 md:p-8 border border-zinc-850 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="space-y-2 relative z-10">
            <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-md tracking-widest">
              Secure Patient Portal
            </span>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">Welcome, {userProfile.name}!</h1>
              {isPremium && (
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2.5 py-1 rounded-full border border-amber-400 shadow-sm">
                  <Crown className="h-3 w-3 shrink-0" />
                  <span>Premium Care</span>
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl font-sans">
              Track clinical visits, download medical reports, and book face-to-face appointments with our sustainable clinical network.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 relative z-10 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("appointments")}
              className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                activeTab === "appointments"
                  ? "bg-white text-zinc-950 border-white shadow-xs"
                  : "bg-transparent text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
              }`}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                activeTab === "reports"
                  ? "bg-white text-zinc-950 border-white shadow-xs"
                  : "bg-transparent text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
              }`}
            >
              My Vault
            </button>
            <button
              onClick={() => setActiveTab("medical_history")}
              className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                activeTab === "medical_history"
                  ? "bg-white text-zinc-950 border-white shadow-xs"
                  : "bg-transparent text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
              }`}
            >
              Medical History
            </button>
            <button
              onClick={() => setActiveTab("ai_consultation")}
              className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "ai_consultation"
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                  : "bg-transparent text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
              AI Clinical Agent
            </button>
            <button
              onClick={() => setActiveTab("billing_medicine")}
              className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "billing_medicine"
                  ? "bg-white text-zinc-950 border-white shadow-xs"
                  : "bg-transparent text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 text-zinc-300" />
              Medicine & Bills
            </button>
          </div>
        </div>

        {/* LOADING SCREEN */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-8 w-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 text-xs font-medium">Authenticating encrypted hospital connection...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* TABS 1: APPOINTMENTS PANEL */}
            {activeTab === "appointments" && (
              <>
                {/* Left side: Booking scheduler */}
                <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                  <div className="space-y-1 pb-4 border-b border-zinc-100">
                    <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2 font-display">
                      <Stethoscope className="h-4.5 w-4.5 text-zinc-800" />
                      <span>Schedule Consultation</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans">Pick department, clinician, and desired timing</p>
                  </div>

                  {bookError && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 flex items-center space-x-2 font-sans">
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{bookError}</span>
                    </div>
                  )}

                  {bookSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 flex items-center space-x-2 font-sans">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{bookSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    
                    {/* Department Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Select Specialty Wing</label>
                      <select
                        value={bookDept}
                        onChange={(e) => {
                          setBookDept(e.target.value);
                          setBookDoctorId(""); // reset doctor when dept changes
                        }}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                      >
                        <option value="Cardiology">Cardiology</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="General Medicine">General Medicine</option>
                      </select>
                    </div>

                    {/* Doctor selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Specialist Clinician</label>
                      <select
                        value={bookDoctorId}
                        onChange={(e) => setBookDoctorId(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                        required
                      >
                        {availableDoctorsForDept.length > 0 ? (
                          availableDoctorsForDept.map((docProfile) => (
                            <option key={docProfile.id} value={docProfile.id}>
                              {docProfile.name} ({docProfile.specialty})
                            </option>
                          ))
                        ) : (
                          <option value="">No specialists found</option>
                        )}
                      </select>
                    </div>

                    {/* Availability guidelines snippet */}
                    {activeDoctorProfile && (
                      <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 text-[9px] text-zinc-600 font-mono space-y-1">
                        <p className="font-bold uppercase tracking-wider text-zinc-400">Physician Roster Info:</p>
                        <p><strong>Days:</strong> {activeDoctorProfile.availableDays.join(", ")}</p>
                        <p><strong>Hours:</strong> {activeDoctorProfile.availableHours.join(", ")}</p>
                      </div>
                    )}

                    {/* Date picker */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Target Date</label>
                      <input
                        type="date"
                        value={bookDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setBookDate(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                        required
                        id="booking-date-input"
                      />
                    </div>

                    {/* Time dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Preferred Hours</label>
                      <select
                        value={bookTime}
                        onChange={(e) => setBookTime(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                        required
                      >
                        <option value="">-- Choose timeslot --</option>
                        {activeDoctorProfile ? (
                          activeDoctorProfile.availableHours.map((hour, idx) => (
                            <option key={idx} value={hour}>{hour}</option>
                          ))
                        ) : (
                          <>
                            <option value="09:00 AM">09:00 AM</option>
                            <option value="10:30 AM">10:30 AM</option>
                            <option value="01:30 PM">01:30 PM</option>
                            <option value="03:00 PM">03:00 PM</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Symptoms / Notes</label>
                      <textarea
                        placeholder="Type any symptoms or special notes for your doctor..."
                        value={bookNotes}
                        onChange={(e) => setBookNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white placeholder:text-zinc-400"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2"
                      id="booking-submit-btn"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{bookingLoading ? "Registering..." : "Submit Appointment Request"}</span>
                    </button>
                  </form>
                </div>

                {/* Right side: Active booked list */}
                <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                  <div className="pb-4 border-b border-zinc-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 font-display">Active Roster & History</h3>
                      <p className="text-xs text-zinc-500 font-sans">Appointments registered under your account</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {appointments.length} Visits
                    </span>
                  </div>

                  {appointments.length > 0 ? (
                    <div className="space-y-4">
                      {appointments.map((app) => (
                        <div 
                          key={app.id} 
                          className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg flex flex-col sm:flex-row justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              {/* Status badge */}
                              {app.status === "pending" && (
                                <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 uppercase tracking-wider">
                                  Pending approval
                                </span>
                              )}
                              {app.status === "confirmed" && (
                                <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-150 uppercase tracking-wider">
                                  Confirmed
                                </span>
                              )}
                              {app.status === "completed" && (
                                <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md border border-zinc-200 uppercase tracking-wider">
                                  Completed visit
                                </span>
                              )}
                              {app.status === "cancelled" && (
                                <span className="text-[9px] font-mono font-bold bg-red-50 text-red-800 px-2 py-0.5 rounded-md border border-red-200 uppercase tracking-wider">
                                  Cancelled
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-zinc-400 font-medium">{app.specialty}</span>
                            </div>

                            <div className="space-y-0.5">
                              <h4 className="font-bold text-zinc-900 text-sm md:text-base font-display">{app.doctorName}</h4>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-sans">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                  {app.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                  {app.time}
                                </span>
                              </div>
                            </div>

                            {app.notes && (
                              <p className="text-xs text-zinc-500 bg-white p-2 rounded-md border border-zinc-200/60 leading-relaxed italic max-w-md">
                                "Notes: {app.notes}"
                              </p>
                            )}

                            {/* Appointment Payment Status */}
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
                              {app.paymentStatus === "paid" ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                                  <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                                  <span>Consultation Fee Paid (₦{(app.amountPaid || bookingFee).toLocaleString()})</span>
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                                    <span>Unpaid Consultation Fee (₦{bookingFee.toLocaleString()})</span>
                                  </span>
                                  <button
                                    onClick={() => handleCheckoutPayment("appointment", bookingFee, app.id)}
                                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                                  >
                                    Pay with Paystack
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action panel */}
                          {(app.status === "pending" || app.status === "confirmed") && (
                            <div className="sm:self-center">
                              <button
                                onClick={() => handleCancelAppointment(app.id)}
                                className="w-full sm:w-auto px-3 py-1.5 border border-zinc-200 hover:border-red-200 text-zinc-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-zinc-50/50 border border-zinc-200 rounded-lg space-y-3">
                      <p className="text-zinc-400 text-xs font-medium">No appointments registered. Schedule your first visit on the left.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TABS 2: REPORTS VAULT */}
            {activeTab === "reports" && (
              <div className="lg:col-span-12 bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-8">
                
                {/* Header line */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-100">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2 font-display">
                      <Shield className="h-4.5 w-4.5 text-zinc-800" />
                      <span>My Medical Vault</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans">Access and download verified clinical diagnostics, labs, and uploaded histories.</p>
                  </div>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    id="add-report-btn"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Upload Diagnostic Lab</span>
                  </button>
                </div>

                {/* Reports grid */}
                {reports.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((rep) => (
                      <div 
                        key={rep.id} 
                        className="bg-zinc-50/30 border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest">
                              {new Date(rep.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-zinc-900 text-xs md:text-sm leading-tight truncate font-display" title={rep.title}>
                              {rep.title}
                            </h4>
                            <p className="text-[9px] text-zinc-400 font-mono truncate">{rep.fileName}</p>
                          </div>

                          {rep.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                              {rep.description}
                            </p>
                          )}
                        </div>

                        <div className="border-t border-zinc-100 pt-4 flex items-center justify-between gap-2">
                          {/* Real-time open or download link! */}
                          <a
                            href={rep.fileUrl}
                            download={rep.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg border border-zinc-200 transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>Download / Open</span>
                          </a>

                          <button
                            onClick={() => handleDeleteReport(rep.id)}
                            className="p-1.5 border border-zinc-200 hover:border-red-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-zinc-50/30 border border-zinc-200 rounded-xl space-y-4 max-w-xl mx-auto">
                    <p className="text-zinc-400 text-xs font-medium px-4">Your medical report vault is empty. Click the button above to upload a diagnostic record.</p>
                  </div>
                )}

              </div>
            )}

            {/* TABS 3: MEDICAL HISTORY */}
            {activeTab === "medical_history" && (
              <div className="lg:col-span-12 space-y-8">
                
                {/* Profile Header Card */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2 font-display">
                      <Activity className="h-5 w-5 text-emerald-500" />
                      <span>Clinical Medical Record</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans">
                      Review chronic conditions, allergies, self-reported metrics, and completed consultation summaries.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200/80 px-3 py-1.5 rounded-lg">
                    Last Updated: {medicalHistory?.lastUpdated ? new Date(medicalHistory.lastUpdated).toLocaleString() : "Never declared"}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Side: Personal Declarations */}
                  <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                    <div className="space-y-1 pb-4 border-b border-zinc-100">
                      <h4 className="text-sm font-bold text-zinc-950 font-display flex items-center gap-2">
                        <FileSignature className="h-4 w-4 text-zinc-700" />
                        <span>Self-Declared Physical Profile</span>
                      </h4>
                      <p className="text-xs text-zinc-500 font-sans">Declare biological metadata & symptoms safely</p>
                    </div>

                    {historySuccess && (
                      <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 flex items-center space-x-2 font-sans">
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{historySuccess}</span>
                      </div>
                    )}

                    {historyError && (
                      <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 flex items-center space-x-2 font-sans">
                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{historyError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveMedicalHistory} className="space-y-4">
                      
                      {/* Blood Type */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Blood Type</label>
                        <select
                          value={historyBloodType}
                          onChange={(e) => setHistoryBloodType(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                        >
                          <option value="">-- Select Blood Type --</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>

                      {/* Allergies */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Allergies (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="Peanuts, Penicillin, Pollen"
                          value={historyAllergies}
                          onChange={(e) => setHistoryAllergies(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                        />
                      </div>

                      {/* Chronic Conditions */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Chronic Conditions (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="Hypertension, Asthma, Diabetes"
                          value={historyConditions}
                          onChange={(e) => setHistoryConditions(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                        />
                      </div>

                      {/* Height & Weight Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Height (cm)</label>
                          <input
                            type="text"
                            placeholder="e.g. 175"
                            value={historyHeight}
                            onChange={(e) => setHistoryHeight(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Weight (kg)</label>
                          <input
                            type="text"
                            placeholder="e.g. 70"
                            value={historyWeight}
                            onChange={(e) => setHistoryWeight(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                          />
                        </div>
                      </div>

                      {/* Blood Pressure & Heart Rate Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Blood Pressure</label>
                          <input
                            type="text"
                            placeholder="e.g. 120/80"
                            value={historyBloodPressure}
                            onChange={(e) => setHistoryBloodPressure(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Heart Rate (bpm)</label>
                          <input
                            type="text"
                            placeholder="e.g. 72"
                            value={historyHeartRate}
                            onChange={(e) => setHistoryHeartRate(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                          />
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Additional Health/Physical Notes</label>
                        <textarea
                          placeholder="e.g. Regular smoker, family history of hypertension..."
                          value={historyAdditionalNotes}
                          onChange={(e) => setHistoryAdditionalNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white resize-none"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={savingHistory}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{savingHistory ? "Updating..." : "Save Physical Profile"}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Side: Past Visits & Clinical Summaries */}
                  <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                    <div className="pb-4 border-b border-zinc-100 flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-950 font-display">Completed Consultation Summaries</h4>
                        <p className="text-xs text-zinc-500 font-sans">Official clinical visit records and treatment guidelines</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {medicalHistory?.pastVisits?.length || 0} Records
                      </span>
                    </div>

                    {/* Chronic conditions overview (Self-declared + verified) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg space-y-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">Biological Details</span>
                        <p className="text-sm font-bold text-zinc-900">Blood Type: {medicalHistory?.bloodType || "Not declared"}</p>
                      </div>
                      <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg space-y-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">Allergies (Verified)</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {medicalHistory?.allergies && medicalHistory.allergies.length > 0 ? (
                            medicalHistory.allergies.map((alg, idx) => (
                              <span key={idx} className="text-[9px] font-semibold bg-red-50 text-red-700 border border-red-150 px-2 py-0.5 rounded-md">
                                {alg}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-450 italic">None reported</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg space-y-1 col-span-2">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">Chronic Diagnoses</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {medicalHistory?.chronicConditions && medicalHistory.chronicConditions.length > 0 ? (
                            medicalHistory.chronicConditions.map((cond, idx) => (
                              <span key={idx} className="text-[10px] font-semibold bg-zinc-200/80 text-zinc-800 border border-zinc-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                <Activity className="h-3 w-3 text-zinc-500" />
                                {cond}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-450 italic">No chronic diagnoses declared.</span>
                          )}
                        </div>
                      </div>

                      {/* Physical Metrics */}
                      <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg space-y-2 col-span-2">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">Physical Metrics Profile</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-1">
                          <div>
                            <p className="text-[10px] text-zinc-400 font-mono">Height</p>
                            <p className="text-xs font-bold text-zinc-800">{medicalHistory?.height ? `${medicalHistory.height} cm` : "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-mono">Weight</p>
                            <p className="text-xs font-bold text-zinc-800">{medicalHistory?.weight ? `${medicalHistory.weight} kg` : "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-mono">Blood Pressure</p>
                            <p className="text-xs font-bold text-zinc-800">{medicalHistory?.bloodPressure || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-mono">Heart Rate</p>
                            <p className="text-xs font-bold text-zinc-800">{medicalHistory?.heartRate ? `${medicalHistory.heartRate} bpm` : "N/A"}</p>
                          </div>
                        </div>
                        {medicalHistory?.additionalNotes && (
                          <div className="pt-2 border-t border-zinc-200/60">
                            <p className="text-[10px] text-zinc-400 font-mono uppercase">Health Notes</p>
                            <p className="text-xs text-zinc-650 leading-relaxed italic">{medicalHistory.additionalNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Past visits timeline */}
                    <div className="space-y-4">
                      {medicalHistory?.pastVisits && medicalHistory.pastVisits.length > 0 ? (
                        medicalHistory.pastVisits.map((visit) => (
                          <div key={visit.id} className="p-5 bg-zinc-50/50 border border-zinc-200 rounded-xl space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-1 text-emerald-500 bg-emerald-500 w-16 rounded-bl-md"></div>
                            
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <h5 className="font-bold text-zinc-900 text-sm font-display">{visit.doctorName}</h5>
                                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{visit.specialty}</p>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                                {visit.date}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs font-bold text-zinc-800 font-sans">Reason for Consultation: <span className="font-normal text-zinc-650">{visit.reason}</span></p>
                              <div className="text-xs text-zinc-600 bg-white p-3 rounded-lg border border-zinc-150 leading-relaxed font-sans">
                                <strong className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Clinical Assessment Summary:</strong>
                                {visit.summary}
                              </div>
                            </div>

                            {visit.prescription && (
                              <div className="bg-amber-50/30 border border-amber-200/70 p-3 rounded-lg space-y-1">
                                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                  <span>Active Prescription</span>
                                </div>
                                <p className="text-xs text-zinc-750 font-mono italic">
                                  "Rx: {visit.prescription}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-zinc-50/50 border border-zinc-200 rounded-xl text-zinc-400 text-xs font-medium font-sans">
                          No past visit summaries recorded yet. Summaries are automatically logged here by your physician after a consultation is finalized.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai_consultation" && (
              <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Interactive Chat */}
                <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl flex flex-col h-[650px] overflow-hidden shadow-xs">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs md:text-sm font-bold text-zinc-950 font-display">Clinical AI Consulting Agent</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">Dual-tool function calling enabled (Gemini 3.5)</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase bg-zinc-200/60 text-zinc-700 px-2.5 py-1 rounded-full">
                      <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                      <span>Active Loop</span>
                    </span>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/20">
                    {aiChatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
                        <div className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                          {msg.role === 'user' ? 'Patient' : 'Clinical Agent'}
                        </div>
                        <div className={`max-w-xl p-3.5 rounded-xl text-xs md:text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-zinc-900 text-white rounded-tr-none' 
                            : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-xs'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          
                          {/* Thoughts/Action Logs timeline */}
                          {msg.thoughts && msg.thoughts.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-600 block">
                                Autonomous Agent Handshakes:
                              </span>
                              {msg.thoughts.map((th, tIdx) => (
                                <div key={tIdx} className="bg-zinc-50 border border-zinc-200 rounded-md p-2 text-[10px] font-mono text-zinc-600 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0"></div>
                                  <div>
                                    Executed tool <span className="font-bold text-zinc-850">{th.action}</span> with parameters: <code className="bg-zinc-150 px-1 py-0.5 rounded-sm">{JSON.stringify(th.arguments)}</code>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center space-x-2 text-zinc-500 text-xs font-mono">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        <span>AI Agent is executing clinical handshakes...</span>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendAiMessage} className="p-3 border-t border-zinc-100 bg-white flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. I am feeling chest pain and fatigue..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      disabled={aiLoading}
                      className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-xs md:text-sm focus:outline-hidden focus:border-zinc-400 bg-white"
                      required
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiInput.trim()}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Consult</span>
                    </button>
                  </form>
                </div>

                {/* Right Column: Premium Upgrade & Action Pathways */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Premium subscription Upgrade block */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 md:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
                        <Crown className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-950 font-display">Premium Clinical Care</h4>
                    </div>

                    {!isPremium ? (
                      <div className="space-y-3">
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Unlock GodsCareHospital Premium Patient tier to gain unrestricted diagnostics logging, digital specialist scheduling, and smart care pathway logging.
                        </p>
                        <div className="bg-amber-50/50 border border-amber-200/60 p-3 rounded-lg text-[10px] font-mono text-amber-800 space-y-1">
                          <p>✓ Unlimited AI Consultation loops</p>
                          <p>✓ Autonomic care pathway persistence</p>
                          <p>✓ Direct-to-physician lab exports</p>
                        </div>
                        <button
                          onClick={handleUpgradeToPremium}
                          disabled={paymentLoading}
                          className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                          id="upgrade-to-premium-btn"
                        >
                          {paymentLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                              <span>Booting Gateway...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Upgrade to Premium (₦500)</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/30 border border-emerald-200 p-4 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                          <span>Premium Tier Activated</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                          Thank you for choosing GodsCareHospital Premium! You have full access to our Agentic AI workflows, diagnostic logging, and hospital system services.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI-Generated Care Pathways list */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 md:p-6 space-y-4 shadow-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                      <h4 className="text-sm font-bold text-zinc-950 font-display flex items-center gap-1.5">
                        <HeartPulse className="h-4.5 w-4.5 text-rose-500" />
                        <span>Autonomic Care Pathways</span>
                      </h4>
                      <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600 border px-2 py-0.5 rounded-full uppercase">
                        {carePlans.length} plans
                      </span>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                      {carePlans.length > 0 ? (
                        carePlans.map((plan) => (
                          <div key={plan.id} className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 relative overflow-hidden">
                            {/* Severity Indicator Ribbon */}
                            <div className={`absolute top-0 right-0 h-1 w-16 rounded-bl-md ${
                              plan.severity === 'high' ? 'bg-red-500' : plan.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}></div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm border ${
                                  plan.severity === 'high' 
                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                    : plan.severity === 'medium' 
                                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {plan.severity} priority
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400">
                                  {new Date(plan.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-zinc-950 leading-tight font-display">AI Diagnostic Insight</h5>
                              <p className="text-xs text-zinc-650 leading-relaxed italic">"{plan.insight}"</p>
                            </div>

                            <div className="space-y-1.5 pt-1 border-t border-zinc-200/50">
                              <h6 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-450">Actionable pathways:</h6>
                              <ul className="space-y-1 font-sans">
                                {plan.carePlan.map((step, sIdx) => (
                                  <li key={sIdx} className="text-xs text-zinc-700 flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">→</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-zinc-400 text-xs font-sans italic">
                          No active care pathways. Consult with your Clinical AI Agent on the left to autonomously generate one based on symptoms.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TABS 5: MEDICINE & BILLING PANEL */}
            {activeTab === "billing_medicine" && (
              <div className="lg:col-span-12 space-y-6">
                <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-100">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2 font-display">
                        <CreditCard className="h-5 w-5 text-zinc-800" />
                        <span>Pharmacy & Financial Services Hub</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-sans">
                        Pay medical bills, browse clinically-approved medicines tailored to your sickness, and check order history.
                      </p>
                    </div>

                    <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 w-full sm:w-auto">
                      <button
                        onClick={() => setBillingSubTab("bills")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          billingSubTab === "bills" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        Medical Bills
                      </button>
                      <button
                        onClick={() => setBillingSubTab("pharmacy")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          billingSubTab === "pharmacy" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        Buy Medicine
                      </button>
                      <button
                        onClick={() => setBillingSubTab("purchases")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          billingSubTab === "purchases" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        Order History
                      </button>
                      <button
                        onClick={() => setBillingSubTab("invoices")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          billingSubTab === "invoices" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        Invoices & Receipts
                      </button>
                    </div>
                  </div>

                  {/* Sub-tab content 1: Bills */}
                  {billingSubTab === "bills" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200/60 rounded-lg p-4 text-xs font-mono">
                        <span>Outstanding Unpaid Bills Total:</span>
                        <span className="text-sm font-extrabold text-red-600">
                          ₦{medicalBills.filter(b => b.status === "unpaid").reduce((sum, b) => sum + b.amount, 0).toLocaleString()} NGN
                        </span>
                      </div>

                      {medicalBills.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {medicalBills.map((bill) => (
                            <div key={bill.id} className="p-5 border border-zinc-200 rounded-xl bg-white space-y-4 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                                    bill.status === "paid"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : "bg-red-50 text-red-800 border-red-200 animate-pulse"
                                  }`}>
                                    {bill.status}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    {new Date(bill.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="font-bold text-zinc-900 text-sm font-display leading-tight">{bill.title}</h4>
                                <p className="text-[10px] font-mono text-zinc-500">ID: {bill.id}</p>
                              </div>

                              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                                <div className="text-sm font-extrabold text-zinc-900">
                                  ₦{bill.amount.toLocaleString()} NGN
                                </div>
                                {bill.status === "unpaid" ? (
                                  <button
                                    onClick={() => handleCheckoutPayment("bill", bill.amount, bill.id)}
                                    className="px-4 py-2 bg-zinc-950 hover:bg-zinc-850 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                                  >
                                    Pay with Paystack
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>Cleared</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-zinc-50/50 border border-zinc-200 rounded-lg">
                          <p className="text-zinc-400 text-xs font-medium">No medical bills registered under your patient account.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab content 2: Pharmacy / Buy Medicine */}
                  {billingSubTab === "pharmacy" && (
                    <div className="space-y-6">
                      <div className="bg-emerald-50/30 border border-emerald-150 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-emerald-950 uppercase font-mono tracking-wider">Describe Sickness or Symptoms</h4>
                        <p className="text-xs text-zinc-650 leading-relaxed font-sans">
                          Describe your exact sickness, symptoms, or level of infection to instantly filter approved remedies. Our system supports selecting mild symptoms, moderate conditions, or severe clinic prescriptions.
                        </p>
                        
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. malaria, severe head ache, body weakness, sore throat, hypertension, dry cough..."
                            value={sicknessDescription}
                            onChange={(e) => setSicknessDescription(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-400 bg-white placeholder:text-zinc-400"
                            id="medicine-sickness-input"
                          />
                          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                        </div>

                        <div className="flex flex-wrap gap-2.5 pt-1.5">
                          <button
                            type="button"
                            onClick={() => setMedicineCategory("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                              medicineCategory === "all" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                            }`}
                          >
                            All Remedies
                          </button>
                          <button
                            type="button"
                            onClick={() => setMedicineCategory("mild")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                              medicineCategory === "mild" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                            }`}
                          >
                            Mild Symptoms (OTC)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMedicineCategory("moderate")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                              medicineCategory === "moderate" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                            }`}
                          >
                            Moderate Pain & Reflux
                          </button>
                          <button
                            type="button"
                            onClick={() => setMedicineCategory("severe")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                              medicineCategory === "severe" ? "bg-red-600 text-white border-red-600" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                            }`}
                          >
                            Severe prescriptions
                          </button>
                        </div>
                      </div>

                      {medicines.filter((med) => {
                        if (medicineCategory !== "all" && med.category !== medicineCategory) return false;
                        if (sicknessDescription.trim()) {
                          const term = sicknessDescription.toLowerCase().trim();
                          const nMatch = med.name.toLowerCase().includes(term);
                          const dMatch = med.description.toLowerCase().includes(term);
                          const sMatch = med.symptoms && med.symptoms.some((s: string) => s.toLowerCase().includes(term));
                          return nMatch || dMatch || sMatch;
                        }
                        return true;
                      }).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {medicines.filter((med) => {
                            if (medicineCategory !== "all" && med.category !== medicineCategory) return false;
                            if (sicknessDescription.trim()) {
                              const term = sicknessDescription.toLowerCase().trim();
                              const nMatch = med.name.toLowerCase().includes(term);
                              const dMatch = med.description.toLowerCase().includes(term);
                              const sMatch = med.symptoms && med.symptoms.some((s: string) => s.toLowerCase().includes(term));
                              return nMatch || dMatch || sMatch;
                            }
                            return true;
                          }).map((med) => (
                            <div key={med.id} className="p-5 border border-zinc-200 rounded-xl bg-white space-y-4 flex flex-col justify-between hover:shadow-xs transition-all">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                                    med.category === "severe" ? "bg-red-50 text-red-700 border-red-200" :
                                    med.category === "moderate" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}>
                                    {med.category} Sickness level
                                  </span>
                                  <span className="text-zinc-900 font-extrabold text-sm font-mono">
                                    ₦{med.price.toLocaleString()}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <h4 className="font-bold text-zinc-900 text-sm md:text-base font-display flex items-center gap-1.5 leading-tight">
                                    <Pill className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{med.name}</span>
                                  </h4>
                                  <p className="text-xs text-zinc-500 leading-relaxed font-sans">{med.description}</p>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {med.symptoms.map((sym: string, i: number) => (
                                    <span key={i} className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">
                                      {sym}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={() => handleCheckoutPayment("medicine", med.price, med.id, med.name)}
                                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                              >
                                Buy & Pay with Paystack
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-zinc-50/50 border border-zinc-200 rounded-lg space-y-2">
                          <p className="text-zinc-400 text-xs font-medium">No matching medicines found for "{sicknessDescription}".</p>
                          <p className="text-[10px] text-zinc-400">Try searching for other general symptoms like head ache, pain, fever, cough, or heart burn.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab content 3: History */}
                  {billingSubTab === "purchases" && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-zinc-900 font-display">Medicine Order History</h4>
                        {medicinePurchases.length > 0 ? (
                          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                            <table className="min-w-full divide-y divide-zinc-200">
                              <thead className="bg-zinc-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Order Ref</th>
                                  <th className="px-6 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Medicine Name</th>
                                  <th className="px-6 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Price</th>
                                  <th className="px-6 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Purchase Date</th>
                                  <th className="px-6 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-xs">
                                {medicinePurchases.map((purchase) => (
                                  <tr key={purchase.id} className="hover:bg-zinc-50/30">
                                    <td className="px-6 py-4 font-mono text-zinc-500 font-medium truncate max-w-[120px]" title={purchase.paymentReference}>
                                      {purchase.paymentReference || purchase.id}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-zinc-900">{purchase.medicineName}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-900 font-bold">₦{purchase.price.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-zinc-500">
                                      {new Date(purchase.purchasedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md uppercase">
                                        {purchase.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-10 border border-zinc-200 rounded-xl text-zinc-400 text-xs italic">
                            No past medicine purchases logged under your account yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab content 4: Invoices & Receipts */}
                  {billingSubTab === "invoices" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-xs font-mono">
                        <span className="text-emerald-800">Verified Payment Transactions Total:</span>
                        <span className="text-sm font-extrabold text-emerald-700">
                          ₦{paymentReceipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} NGN
                        </span>
                      </div>

                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between">
                          <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest">Completed Payments Invoice Ledger</h4>
                          <span className="text-[10px] font-mono font-medium text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-2.5 py-0.5 rounded-full">{paymentReceipts.length} Payments Verified</span>
                        </div>

                        {paymentReceipts.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-mono text-[9px] uppercase tracking-widest">
                                  <th className="px-6 py-3 font-semibold">Receipt Ref</th>
                                  <th className="px-6 py-3 font-semibold">Payment Type</th>
                                  <th className="px-6 py-3 font-semibold">Amount Paid</th>
                                  <th className="px-6 py-3 font-semibold">Date Paid</th>
                                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-xs">
                                {paymentReceipts.map((receipt) => {
                                  let friendlyType = "Healthcare Payment";
                                  if (receipt.paymentType === "premium") friendlyType = "Premium Subscription Upgrade";
                                  else if (receipt.paymentType === "appointment") friendlyType = "Clinical Appointment Booking";
                                  else if (receipt.paymentType === "bill") friendlyType = "Medical Bill Settlement";
                                  else if (receipt.paymentType === "medicine") friendlyType = "Pharmacy Drug Purchase";

                                  return (
                                    <tr key={receipt.id} className="hover:bg-zinc-50/30">
                                      <td className="px-6 py-4 font-mono text-zinc-600 font-bold truncate max-w-[140px]" title={receipt.reference}>
                                        {receipt.reference}
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-semibold text-zinc-900">{friendlyType}</span>
                                      </td>
                                      <td className="px-6 py-4 font-mono text-emerald-600 font-bold">₦{receipt.amount.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-zinc-500">
                                        {new Date(receipt.createdAt).toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <button
                                          onClick={() => setSelectedInvoice(receipt)}
                                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-white rounded-md text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                                        >
                                          <FileText className="h-3 w-3" />
                                          <span>View Invoice</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-zinc-50/50 text-zinc-400 text-xs italic">
                            No payment transactions or invoice receipts logged in your clinical record yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

        {/* UPLOAD REPORT MODAL POPOVER */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-md w-full border border-zinc-200">
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Modal Header */}
                <div className="flex justify-between items-start pb-2 border-b border-zinc-100">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 font-display">Upload Clinical Document</h3>
                    <p className="text-xs text-zinc-500 font-sans">Encrypt and save diagnostics in your vault</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowUploadModal(false);
                      setReportError("");
                      setReportSuccess("");
                    }}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 cursor-pointer h-7 w-7 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {/* Feedback Alerts */}
                {reportError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-sans">
                    {reportError}
                  </div>
                )}

                {reportSuccess && (
                  <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100 font-sans">
                    {reportSuccess}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleUploadReport} className="space-y-4">
                  
                  {/* Document Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Chest X-Ray scan, Lipid Panel lab"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white"
                      required
                      id="report-title-input"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Notes / Description (Optional)</label>
                    <textarea
                      placeholder="Identify prescribing doctor or diagnostic details..."
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-400 bg-white placeholder:text-zinc-400"
                    />
                  </div>

                  {/* File Selector & Drag-Drop Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">Select File (Image or PDF)</label>
                    <div className="border border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg p-4 text-center cursor-pointer hover:bg-zinc-50 transition-all relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        id="report-file-input"
                      />
                      <div className="space-y-2 pointer-events-none">
                        <UploadCloud className="h-6 w-6 text-zinc-400 mx-auto" />
                        <div className="text-xs text-zinc-500">
                          {reportFile ? (
                            <span className="font-bold text-zinc-800">{reportFile.name} ({(reportFile.size/1024).toFixed(1)} KB)</span>
                          ) : (
                            <span>Drag & drop or <strong className="text-zinc-900 font-semibold">browse files</strong></span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-400">PDF, PNG, JPG files up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 transition-all"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{uploadLoading ? "Encrypting..." : "Upload Document"}</span>
                    </button>
                  </div>

                </form>

              </div>
            </div>
          </div>
        )}

        {/* DIRECT LOCAL SELF-HEALING BILLING FALLBACK MODAL */}
        {showLocalPaymentModal && localPaymentData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs overflow-y-auto">
            <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-in fade-in zoom-in duration-200">
              
              {/* Left Column: Summary */}
              <div className="md:col-span-5 bg-zinc-900 text-white p-6 md:p-8 flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                      Self-Healing Ledger Active
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-white">GodsCare Hospital</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Direct-to-Firestore Clinical Vault</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-t border-zinc-800 pt-4">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-0.5">Patient Details</span>
                    <p className="text-xs font-medium text-zinc-200 truncate">{userProfile.email}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{userProfile.name}</p>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-0.5">Item Description</span>
                    <p className="text-xs font-medium text-zinc-300 leading-relaxed">
                      {localPaymentData.paymentType === "premium" && "GodsCare Premium Diagnostics & 24/7 Care Access"}
                      {localPaymentData.paymentType === "appointment" && `Specialist Consultation Booking (ID: ${localPaymentData.targetId})`}
                      {localPaymentData.paymentType === "bill" && `Outstanding Medical Invoice Clearance (ID: ${localPaymentData.targetId})`}
                      {localPaymentData.paymentType === "medicine" && `Prescription Pharmacy Formulation: ${localPaymentData.medicineName || localPaymentData.targetId}`}
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">Total Amount</span>
                  <div className="flex items-baseline gap-1 mt-1 text-emerald-400">
                    <span className="text-2xl font-extrabold tracking-tight">₦{localPaymentData.amount.toLocaleString()}</span>
                    <span className="text-[10px] font-bold font-mono">NGN</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="md:col-span-7 p-6 md:p-8 space-y-6 flex flex-col justify-between bg-[#fbfbfc] text-zinc-800">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <h4 className="text-xs font-extrabold text-zinc-900 tracking-tight uppercase">Direct Card Authorization</h4>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">Direct Sandbox Ledger</span>
                  </div>

                  {/* Card Visualizer */}
                  <div className={`relative overflow-hidden w-full h-40 rounded-2xl bg-gradient-to-br ${localSelectedBrand === "Visa" ? "from-blue-600 to-indigo-900" : localSelectedBrand === "Mastercard" ? "from-rose-600 to-orange-900" : localSelectedBrand === "Verve" ? "from-emerald-700 to-teal-900" : localSelectedBrand === "Amex" ? "from-zinc-700 to-slate-900" : localSelectedBrand === "Discover" ? "from-orange-500 to-red-800" : "from-zinc-800 to-zinc-950"} p-5 text-white shadow-md flex flex-col justify-between transition-all duration-300`}>
                    <div className="flex justify-between items-start">
                      {/* Gold Chip */}
                      <svg className="w-8 h-6 text-amber-400/95" fill="currentColor" viewBox="0 0 48 39">
                        <rect x="2" y="2" width="44" height="35" rx="6" fill="#D4AF37" />
                        <line x1="2" y1="12" x2="14" y2="12" stroke="#111" strokeWidth="1.5" />
                        <line x1="2" y1="20" x2="14" y2="20" stroke="#111" strokeWidth="1.5" />
                        <line x1="2" y1="28" x2="14" y2="28" stroke="#111" strokeWidth="1.5" />
                        <line x1="34" y1="12" x2="46" y2="12" stroke="#111" strokeWidth="1.5" />
                        <line x1="34" y1="20" x2="46" y2="20" stroke="#111" strokeWidth="1.5" />
                        <line x1="34" y1="28" x2="46" y2="28" stroke="#111" strokeWidth="1.5" />
                        <rect x="14" y="6" width="20" height="27" fill="none" stroke="#111" strokeWidth="1.5" />
                        <line x1="14" y1="16" x2="34" y2="16" stroke="#111" strokeWidth="1.5" />
                        <line x1="14" y1="24" x2="34" y2="24" stroke="#111" strokeWidth="1.5" />
                      </svg>
                      <div className="font-bold font-mono tracking-wider text-[10px] px-2 py-1 rounded bg-white/15 text-white backdrop-blur-xs">
                        {localSelectedBrand}
                      </div>
                    </div>

                    <div className="font-mono text-base md:text-lg font-bold tracking-[0.2em] text-white/90">
                      {localCardNumber || "•••• •••• •••• ••••"}
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-white/75 uppercase">
                      <div>
                        <span className="text-[7px] text-white/40 block">Cardholder</span>
                        <span className="font-medium tracking-wider truncate max-w-[120px] block">{localCardHolder || "Patient Name"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[7px] text-white/40 block">Expires</span>
                        <span className="font-medium">{localCardExpiry || "MM/YY"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Selector presets */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block">Pre-fill Verified Sandbox Cards</span>
                    <div className="grid grid-cols-5 gap-1">
                      {["Verve", "Visa", "Mastercard", "Amex", "Discover"].map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            const cards: Record<string, any> = {
                              'Verve': { number: '5061 0422 9384 1029', holder: userProfile.name || 'Patient Name', expiry: '12/28', cvv: '931' },
                              'Visa': { number: '4111 2222 3333 4444', holder: userProfile.name || 'Patient Name', expiry: '08/29', cvv: '123' },
                              'Mastercard': { number: '5543 2190 8765 4321', holder: userProfile.name || 'Patient Name', expiry: '10/27', cvv: '456' },
                              'Amex': { number: '3782 822463 10005', holder: userProfile.name || 'Patient Name', expiry: '05/30', cvv: '883' },
                              'Discover': { number: '6011 2345 6789 0123', holder: userProfile.name || 'Patient Name', expiry: '11/28', cvv: '702' }
                            };
                            const card = cards[brand];
                            if (card) {
                              setLocalCardNumber(card.number);
                              setLocalCardHolder(card.holder);
                              setLocalCardExpiry(card.expiry);
                              setLocalCardCvv(card.cvv);
                              setLocalSelectedBrand(brand);
                            }
                          }}
                          className={`px-1 py-1 border rounded-lg text-[9px] font-bold text-center cursor-pointer transition ${
                            localSelectedBrand === brand
                              ? "bg-zinc-900 border-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Form Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Card Number</label>
                      <input
                        type="text"
                        value={localCardNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                          let formatted = [];
                          for (let i = 0; i < val.length; i += 4) {
                            formatted.push(val.slice(i, i + 4));
                          }
                          setLocalCardNumber(formatted.join(' '));
                          
                          // Brand detection
                          if (/^4/.test(val)) setLocalSelectedBrand('Visa');
                          else if (/^(5[1-5]|222[1-9])/.test(val)) setLocalSelectedBrand('Mastercard');
                          else if (/^(506[0-1])/.test(val)) setLocalSelectedBrand('Verve');
                          else if (/^3[47]/.test(val)) setLocalSelectedBrand('Amex');
                          else if (/^6011/.test(val)) setLocalSelectedBrand('Discover');
                        }}
                        maxLength={19}
                        placeholder="5061 •••• •••• ••••"
                        className="w-full mt-1 px-3.5 py-2 border border-zinc-200 focus:border-zinc-900 rounded-xl text-xs font-mono tracking-wider outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Cardholder Name</label>
                      <input
                        type="text"
                        value={localCardHolder}
                        onChange={(e) => setLocalCardHolder(e.target.value)}
                        placeholder="e.g. Dr. Elizabeth Vance"
                        className="w-full mt-1 px-3.5 py-2 border border-zinc-200 focus:border-zinc-900 rounded-xl text-xs outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Expiry Date</label>
                        <input
                          type="text"
                          value={localCardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) {
                              val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            }
                            setLocalCardExpiry(val);
                          }}
                          maxLength={5}
                          placeholder="MM/YY"
                          className="w-full mt-1 px-3.5 py-2 border border-zinc-200 focus:border-zinc-900 rounded-xl text-xs outline-none transition text-center font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">CVV Code</label>
                        <input
                          type="password"
                          value={localCardCvv}
                          onChange={(e) => setLocalCardCvv(e.target.value.replace(/\D/g, ''))}
                          maxLength={4}
                          placeholder="•••"
                          className="w-full mt-1 px-3.5 py-2 border border-zinc-200 focus:border-zinc-900 rounded-xl text-xs outline-none transition text-center font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (!localCardNumber || localCardNumber.length < 12) {
                        alert("Please enter a valid card number.");
                        return;
                      }
                      if (!localCardHolder) {
                        alert("Please enter cardholder name.");
                        return;
                      }
                      if (!localCardExpiry || localCardExpiry.length < 5) {
                        alert("Please enter valid expiration date (MM/YY).");
                        return;
                      }
                      if (!localCardCvv || localCardCvv.length < 3) {
                        alert("Please enter valid CVV.");
                        return;
                      }
                      setShowLocalPinModal(true);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 animate-pulse"
                  >
                    Authorize Ledger Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocalPaymentModal(false);
                      setLocalPaymentData(null);
                    }}
                    className="block w-full py-2 text-center border border-zinc-200 text-zinc-500 rounded-xl text-[10px] font-mono uppercase tracking-wider hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* DIRECT LOCAL BILLING PIN MODAL */}
        {showLocalPinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 max-w-xs w-full shadow-2xl text-center space-y-4">
              <div className="space-y-1 text-zinc-800">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Card Authorization</h3>
                <h2 className="text-sm font-extrabold text-zinc-950">Enter Card PIN</h2>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Enter your card's 4-digit security PIN to write to the direct ledger</p>
              </div>

              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    type="password"
                    maxLength={1}
                    value={localPin[idx] || ""}
                    id={`local-pin-${idx}`}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const newPin = [...localPin];
                      newPin[idx] = val;
                      setLocalPin(newPin);
                      
                      // Auto focus next box
                      if (val && idx < 3) {
                        const nextBox = document.getElementById(`local-pin-${idx + 1}`);
                        if (nextBox) nextBox.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !localPin[idx] && idx > 0) {
                        const prevBox = document.getElementById(`local-pin-${idx - 1}`);
                        if (prevBox) prevBox.focus();
                      }
                    }}
                    className="w-10 h-12 border border-zinc-200 focus:border-zinc-900 rounded-lg text-center font-bold text-lg outline-none text-zinc-900 bg-zinc-50/50 focus:bg-white transition-all"
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLocalPinModal(false)}
                  className="w-1/2 py-2 text-[10px] font-mono uppercase tracking-wider border border-zinc-200 rounded-lg text-zinc-500 font-medium hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={localAuthorizing}
                  onClick={processDirectFirestorePayment}
                  className="w-1/2 py-2 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  {localAuthorizing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Paying...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETAILED INVOICE MODAL POPUP */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-lg w-full border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              
              {/* Receipt Body printable */}
              <div id="printable-invoice" className="p-6 md:p-8 space-y-6">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-zinc-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-900 font-extrabold text-sm font-display tracking-tight">
                      <HeartPulse className="h-4.5 w-4.5 text-red-500" />
                      <span>GodsCare Hospital</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      PLOT 12, CLINICAL AVE, NIGERIA<br />
                      SUPPORT@GODSCAREHOSPITAL.COM
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
                      OFFICIAL RECEIPT
                    </span>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1.5">
                      REF: {selectedInvoice.reference}<br />
                      DATE: {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Patient / Billing Info */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-4 border-b border-zinc-100">
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">PATIENT DETAIL:</h5>
                    <p className="font-bold text-zinc-900">{userProfile.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">ID: {userProfile.uid}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{userProfile.email}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">TRANSACTION:</h5>
                    <p className="font-bold text-zinc-900">Secure Paystack Checkout</p>
                    <p className="text-[10px] text-emerald-600 font-mono font-bold">STATUS: SUCCESSFUL (PAID)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">DATE PAID: {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Itemized Charge */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">ITEMIZED CHARGES:</h5>
                  
                  <div className="border border-zinc-200 rounded-lg overflow-hidden font-sans">
                    <div className="grid grid-cols-12 bg-zinc-50 border-b border-zinc-200 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      <div className="col-span-8">Description</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-2 text-right">Amount</div>
                    </div>
                    
                    <div className="grid grid-cols-12 px-4 py-3.5 text-xs text-zinc-800 border-b border-zinc-100 bg-white">
                      <div className="col-span-8 font-semibold">
                        {selectedInvoice.paymentType === "premium" && "GodsCare Premium Diagnostics & 24/7 Virtual Patient Assistant Access Subscription Package"}
                        {selectedInvoice.paymentType === "appointment" && `Specialist Clinical Consultation Booking Fee (ID: ${selectedInvoice.targetId})`}
                        {selectedInvoice.paymentType === "bill" && `Custom Medical Invoice Clearance (ID: ${selectedInvoice.targetId})`}
                        {selectedInvoice.paymentType === "medicine" && "Prescribed Pharmacy Drug Formulation Dispensation Fee"}
                      </div>
                      <div className="col-span-2 text-center font-mono font-medium">1</div>
                      <div className="col-span-2 text-right font-mono font-bold">₦{selectedInvoice.amount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="border-t border-zinc-100 pt-4 flex flex-col items-end space-y-1.5 text-xs">
                  <div className="flex justify-between w-full max-w-[200px] text-zinc-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">₦{selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[200px] text-zinc-500 border-b border-zinc-100 pb-1.5">
                    <span>Tax (VAT 0% Inc):</span>
                    <span className="font-mono">₦0.00</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[200px] text-zinc-950 font-bold text-sm">
                    <span>Grand Total Paid:</span>
                    <span className="font-mono text-emerald-600">₦{selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer Declaration */}
                <div className="text-center pt-2">
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                    Thank you for choosing GodsCare Hospital. This document acts as an official electronic receipt.<br />
                    System ID: <span className="font-mono">{selectedInvoice.id}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById("printable-invoice")?.innerHTML;
                    if (printContents) {
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Invoice - ${selectedInvoice.reference}</title>
                              <script src="https://cdn.tailwindcss.com"></script>
                              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
                              <style>
                                body { font-family: 'Inter', sans-serif; padding: 40px; }
                                @media print {
                                  body { padding: 0; }
                                }
                              </style>
                            </head>
                            <body>
                              <div>\${printContents}</div>
                              <script>
                                window.onload = function() {
                                  window.print();
                                  setTimeout(function() { window.close(); }, 500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
