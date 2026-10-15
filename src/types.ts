export type UserRole = "patient" | "admin" | "admin_administrator" | "admin administrator";

export function normalizeUserRole(role?: string | null, email?: string | null): "patient" | "admin" | "admin_administrator" {
  const normEmail = (email || "").toLowerCase().trim();
  const normRole = (role || "").toLowerCase().trim();

  // Primary Super Administrator accounts
  if (
    normEmail === "hustenisama@gmail.com" ||
    normEmail === "austineisama150@gmail.com" ||
    normEmail === "austineisama@gmail.com" ||
    normEmail.includes("director") ||
    normRole === "admin_administrator" ||
    normRole === "admin administrator" ||
    normRole === "super_admin" ||
    normRole === "director"
  ) {
    return "admin_administrator";
  }

  // Clinical & Staff Administrators
  if (
    normRole === "admin" ||
    normRole === "staff" ||
    normRole === "staff_admin" ||
    normRole === "staff admin" ||
    normRole === "admin.staff" ||
    normEmail === "admin@greencare.com" ||
    normEmail.includes("staff") ||
    normEmail.includes("admin.staff") ||
    normEmail.includes("billing")
  ) {
    return "admin";
  }

  return "patient";
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  isPremium?: boolean; // Payment subscription status
  phone?: string;
}

export interface SiteSettings {
  hospitalName: string;
  tagline: string;
  emergencyPhone: string;
  generalPhone: string;
  email: string;
  address: string;
  announcement: string;
  announcementActive: boolean;
  appointmentBookingFee: number;
  premiumSubscriptionFee: number;
}

export interface CarePlan {
  id: string;
  patientId: string;
  insight: string; // Structured clinical insight or diagnosis summary from agent
  carePlan: string[]; // Step-by-step actionable care pathways
  severity: "low" | "medium" | "high";
  generatedBy: string; // e.g., "AI Agent (Gemini 3.5)"
  createdAt: string;
}

export interface PaymentLog {
  id: string;
  patientId: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  experience: string; // e.g., "12 years"
  education: string; // e.g., "M.D. Harvard Medical School"
  rating: number; // e.g., 4.9
  availableDays: string[]; // e.g., ["Monday", "Wednesday", "Friday"]
  availableHours: string[]; // e.g., ["09:00 AM", "10:00 AM", "02:00 PM"]
  image: string;
  bio: string;
  consultationFee?: number;
}

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  paymentStatus?: "unpaid" | "paid";
  paymentAmount?: number;
  amountPaid?: number;
  paymentReference?: string;
}

export interface MedicalBill {
  id: string;
  patientId: string;
  title: string;
  amount: number;
  status: "unpaid" | "paid";
  createdAt: string;
  paymentReference?: string;
  paidAt?: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: "mild" | "moderate" | "severe";
  symptoms: string[];
  description: string;
  price: number;
}

export interface MedicinePurchase {
  id: string;
  patientId: string;
  medicineId: string;
  medicineName: string;
  price: number;
  status: "paid";
  purchasedAt: string;
  paymentReference: string;
}

export interface Report {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  description?: string;
  fileUrl: string; // base64 or a mock url
  fileName: string;
  uploadedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon: string; // name of lucide-react icon
  commonConditions: string[];
}

export interface PastVisit {
  id: string;
  date: string;
  doctorName: string;
  specialty: string;
  reason: string;
  summary: string;
  prescription?: string;
}

export interface MedicalHistory {
  id: string; // matches user's patientId
  patientId: string;
  chronicConditions: string[];
  allergies?: string[];
  bloodType?: string;
  height?: string;
  weight?: string;
  bloodPressure?: string;
  heartRate?: string;
  additionalNotes?: string;
  pastVisits: PastVisit[];
  lastUpdated: string;
}
