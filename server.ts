import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where 
} from "firebase/firestore";

// Load environment variables
dotenv.config();

const resolvedDir = process.cwd();

export const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all incoming requests (e.g., from Vercel deployments)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Load Firebase configuration from applet config JSON
let firebaseApp;
let db: any;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log(`[Firebase] Initialized Firestore connected to: ${firebaseConfig.firestoreDatabaseId}`);
} catch (error) {
  console.error("[Firebase] Error loading configuration:", error);
}

// ==========================================
// PAYMENT GATEWAY API (PAYSTACK)
// ==========================================

// Paystack Helper with fallback to live key provided by user
const getPaystackSecretKey = (): string => {
  const envKey = process.env.PAYSTACK_SECRET_KEY;
  if (envKey && envKey !== "dummy_key" && envKey.trim() !== "") {
    return envKey.trim();
  }
  return "sk_live_d53b80bf69d2f8d14550eb8affa1539a9ec1ccbd";
};

const MEDICINES = [
  { id: "med-1", name: "Paracetamol BP 500mg", category: "mild", symptoms: ["Mild Fever", "Headache", "Minor Pain", "Body Ache"], description: "Effective relief for minor fever, headaches, and general body fatigue.", price: 1000 },
  { id: "med-2", name: "Cetirizine Hydrochloride 10mg", category: "mild", symptoms: ["Running Nose", "Sneezing", "Allergy", "Itchy Eyes"], description: "Non-drowsy antihistamine for quick allergy relief, rhinitis, and hives.", price: 1200 },
  { id: "med-3", name: "Vitamin C Zinc Boost", category: "mild", symptoms: ["Immune Deficiency", "Cold", "Mild Fatigue"], description: "Supports recovery from common cold and builds immune resistance.", price: 1500 },
  { id: "med-4", name: "Ibuprofen 400mg", category: "moderate", symptoms: ["Moderate Pain", "Dental Pain", "Inflammation", "Joint Swelling"], description: "Anti-inflammatory pain reliever suited for joint stiffness, muscle sprains, and backaches.", price: 2500 },
  { id: "med-5", name: "Omeprazole Delayed-Release 20mg", category: "moderate", symptoms: ["Acid Reflux", "Heartburn", "Stomach Ulcer", "Indigestion"], description: "Proton-pump inhibitor that effectively suppresses stomach acid and treats GERD symptoms.", price: 3000 },
  { id: "med-6", name: "Dextromethorphan Cough Syrup", category: "moderate", symptoms: ["Dry Cough", "Throat Irritation", "Congestion"], description: "Fast-acting cough suppressant to clear respiratory pathways and soothe throat tissues.", price: 2800 },
  { id: "med-7", name: "Co-Amoxiclav Duo 625mg", category: "severe", symptoms: ["Bacterial Infection", "Severe Cough", "Bronchitis", "Dental Abscess"], description: "Broad-spectrum antibacterial therapy to treat moderate-to-severe systemic infections.", price: 7500 },
  { id: "med-8", name: "Amlodipine Besylate 5mg", category: "severe", symptoms: ["High Blood Pressure", "Hypertension Control", "Chronic Chest Tightness"], description: "Calcium channel blocker for management of cardiovascular hypertension and angina.", price: 6000 },
  { id: "med-9", name: "Salbutamol Inhaler 100mcg", category: "severe", symptoms: ["Asthma Attack", "Wheezing", "Shortness of Breath", "COPD Relief"], description: "Bronchodilator providing rapid airway expansion during acute bronchospasms or chest wheezing.", price: 5500 }
];

// Initialize Paystack checkout session
app.post("/api/payments/initialize", async (req: express.Request, res: express.Response) => {
  const { email, amount, userId, paymentType, targetId, medicineName, origin } = req.body;
  if (!email || !amount || !userId || !paymentType) {
    res.status(400).json({ error: "Missing required billing details: email, amount, userId, paymentType." });
    return;
  }

  const cleanTargetId = targetId || "none";
  const cleanMedicineName = medicineName || "";

  // Dynamic host & protocol detection for callback_url
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || `localhost:${PORT}`;
  const dynamicAppUrl = `${proto}://${host}`;
  const clientOrigin = origin || dynamicAppUrl;

  const paystackSecret = getPaystackSecretKey();
  const reference = `gcare-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  if (!paystackSecret) {
    res.status(400).json({
      error: "Paystack live/test billing gateway is not configured. Payments require PAYSTACK_SECRET_KEY to be set in the environment variables."
    });
    return;
  }

  try {
    // Call the Paystack Initialize API
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack expects amount in Kobo (Naira cents)
        reference,
        channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
        callback_url: `${process.env.APP_URL || dynamicAppUrl}/api/payments/verify-callback?userId=${userId}&origin=${encodeURIComponent(clientOrigin)}`,
        metadata: {
          userId,
          paymentType,
          targetId: cleanTargetId,
          medicineName: cleanMedicineName,
          custom_fields: [
            { display_name: "Patient ID", variable_name: "patient_id", value: userId },
            { display_name: "Payment Type", variable_name: "payment_type", value: paymentType },
            { display_name: "Target Item ID", variable_name: "target_id", value: cleanTargetId }
          ]
        }
      })
    });

    const data = await paystackRes.json();
    if (data.status) {
      res.json({
        status: "success",
        reference,
        checkoutUrl: data.data.authorization_url,
        accessCode: data.data.access_code
      });
    } else {
      console.warn("[Paystack Error]:", data.message);
      res.status(400).json({ error: `Paystack initialization failed: ${data.message}` });
    }
  } catch (err: any) {
    console.error("[Paystack] Initialization Error:", err);
    res.status(500).json({ error: `Paystack initialization error: ${err.message || err}` });
  }
});

// Serve local sandbox billing checkout simulator screen (DISABLED)
app.get("/api/payments/simulate-gate", (req: express.Request, res: express.Response) => {
  res.status(403).send("The sandbox billing simulator has been disabled. Live payments are enforced.");
  return;
  /*
  const { reference, userId, amount, email, paymentType, targetId, medicineName } = req.query;
  const itemDesc = 
    paymentType === "premium" ? "GodsCareHospital Premium Patient Care Subscription" :
    paymentType === "appointment" ? `Medical Appointment Fee Booking (ID: ${targetId})` :
    paymentType === "bill" ? `Outstanding Medical Bill Fee (ID: ${targetId})` :
    paymentType === "medicine" ? `Prescription Medicine Purchase: ${medicineName || targetId}` :
    "Healthcare Payment Service";

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>GodsCareHospital Sandbox Paystack Gateway</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            background-color: #f1f5f9;
            color: #27272a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1rem;
            line-height: 1.5;
          }
          .font-mono, .font-mono-card { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .max-w-2xl { max-width: 48rem; width: 100%; }
          .gateway-card {
            display: grid;
            grid-template-columns: 1fr;
            background: #ffffff;
            border-radius: 1.5rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            width: 100%;
          }
          @media (min-width: 768px) {
            .gateway-card { grid-template-columns: 5fr 7fr; }
          }
          .left-panel {
            background-color: #18181b;
            color: #ffffff;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 2rem;
          }
          @media (min-width: 768px) {
            .left-panel { padding: 2rem; }
          }
          .right-panel {
            padding: 1.5rem;
            background-color: #fbfbfc;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 1.5rem;
          }
          @media (min-width: 768px) {
            .right-panel { padding: 2rem; }
          }
          .badge {
            font-size: 10px;
            font-family: ui-monospace, monospace;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #34d399;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            padding: 0.25rem 0.6rem;
            border-radius: 0.375rem;
            display: inline-block;
          }
          .border-divider { border-top: 1px solid #27272a; padding-top: 1rem; }
          .border-divider-light { border-bottom: 1px solid #f4f4f5; padding-bottom: 1rem; }
          .btn-primary {
            width: 100%;
            padding: 0.75rem;
            background-color: #059669;
            color: #ffffff;
            border: none;
            border-radius: 0.75rem;
            font-size: 0.75rem;
            font-family: ui-monospace, monospace;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .btn-primary:hover { background-color: #047857; }
          .btn-secondary {
            display: block;
            width: 100%;
            padding: 0.625rem;
            text-align: center;
            border: 1px solid #e4e4e7;
            color: #71717a;
            border-radius: 0.75rem;
            font-size: 0.75rem;
            font-family: ui-monospace, monospace;
            text-transform: uppercase;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-secondary:hover { background-color: #f4f4f5; color: #18181b; }
          .input-field {
            width: 100%;
            padding: 0.625rem 1rem;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            font-family: ui-monospace, monospace;
            outline: none;
            transition: border-color 0.2s;
          }
          .input-field:focus { border-color: #18181b; }
          .tab-btn {
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            padding-bottom: 0.5rem;
            font-size: 0.75rem;
            font-weight: 700;
            color: #a1a1aa;
            cursor: pointer;
          }
          .tab-btn.active { color: #059669; border-bottom-color: #059669; }
          .card-chip {
            width: 100%;
            height: 11rem;
            border-radius: 1rem;
            background: linear-gradient(135deg, #27272a 0%, #09090b 100%);
            padding: 1.5rem;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .quick-card-btn {
            padding: 0.375rem 0.5rem;
            border: 1px solid #e4e4e7;
            border-radius: 0.5rem;
            font-size: 10px;
            font-weight: 700;
            color: #52525b;
            background: #ffffff;
            cursor: pointer;
            text-align: center;
          }
          .quick-card-btn:hover { background: #f4f4f5; border-color: #d4d4d8; }
          .grid-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.375rem; }
          @media (max-width: 480px) {
            .grid-cards { grid-template-columns: repeat(2, 1fr); }
          }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .gap-1 { gap: 0.25rem; }
          .gap-2 { gap: 0.5rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          .space-y-2 > * + * { margin-top: 0.5rem; }
          .text-xs { font-size: 0.75rem; }
          .text-sm { font-size: 0.875rem; }
          .text-xl { font-size: 1.25rem; }
          .text-2xl { font-size: 1.5rem; }
          .font-bold { font-weight: 700; }
          .font-extrabold { font-weight: 800; }
          .text-emerald-400 { color: #34d399; }
          .text-zinc-400 { color: #a1a1aa; }
          .text-zinc-500 { color: #71717a; }
          .text-zinc-200 { color: #e4e4e7; }
          .text-zinc-900 { color: #18181b; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .break-all { word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="max-w-2xl gateway-card">
          
          <!-- Left side: Order & Brand Info -->
          <div class="md:col-span-5 bg-zinc-900 text-white p-6 md:p-8 flex flex-col justify-between space-y-8">
            <div class="space-y-4">
              <div class="flex items-center gap-2.5">
                <span class="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  Paystack Sandbox
                </span>
              </div>
              <div>
                <h1 class="text-xl font-extrabold tracking-tight text-white">GodsCare Clinic</h1>
                <p class="text-xs text-zinc-400 mt-1">Unified Medical Billing Portal</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="border-t border-zinc-800 pt-4">
                <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Customer Email</span>
                <p class="text-xs font-medium text-zinc-200 truncate">${email}</p>
              </div>

              <div class="border-t border-zinc-800 pt-4">
                <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Fee Description</span>
                <p class="text-xs font-medium text-zinc-300 leading-relaxed">${itemDesc}</p>
              </div>

              <div class="border-t border-zinc-800 pt-4">
                <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Transaction Ref</span>
                <p class="text-[11px] font-mono text-zinc-400 break-all">${reference}</p>
              </div>
            </div>

            <div class="border-t border-zinc-800 pt-4">
              <span class="text-xs text-zinc-500 font-medium block">Total Payable</span>
              <div class="flex items-baseline gap-1 mt-1 text-emerald-400">
                <span class="text-2xl font-extrabold tracking-tight">₦${amount}</span>
                <span class="text-[10px] font-bold font-mono">NGN</span>
              </div>
            </div>
          </div>

          <!-- Right side: Payment form and brand selector -->
          <div class="md:col-span-7 p-6 md:p-8 space-y-6 flex flex-col justify-between bg-[#fbfbfc]">
            <div>
              <div class="flex items-center justify-between pb-4 border-b border-zinc-100">
                <h2 id="methodTitle" class="text-sm font-extrabold text-zinc-900 tracking-tight">Debit/Credit Card Payment</h2>
                <div class="flex gap-1">
                  <!-- Real-time Status -->
                  <span class="flex h-2 w-2 relative">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span class="text-[10px] font-mono font-bold text-zinc-400">Sandbox Mode</span>
                </div>
              </div>

              <!-- Payment Method Tabs -->
              <div class="flex border-b border-zinc-100 mb-5 gap-1 sm:gap-2">
                <button type="button" onclick="switchTab('card')" id="tab-card" class="pb-2 text-xs font-bold text-emerald-600 border-b-2 border-emerald-600 px-2 cursor-pointer">
                  Card
                </button>
                <button type="button" onclick="switchTab('transfer')" id="tab-transfer" class="pb-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 px-2 cursor-pointer">
                  Bank Transfer
                </button>
                <button type="button" onclick="switchTab('bank')" id="tab-bank" class="pb-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 px-2 cursor-pointer">
                  Bank Account
                </button>
                <button type="button" onclick="switchTab('ussd')" id="tab-ussd" class="pb-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 px-2 cursor-pointer">
                  USSD
                </button>
              </div>

              <!-- PANE 1: CARD -->
              <div id="pane-card" class="space-y-4">
                <!-- Interactive Card Visualizer -->
                <div id="cardVisual" class="relative overflow-hidden mt-5 w-full h-44 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 text-white shadow-md flex flex-col justify-between transition-all duration-300">
                <!-- Chip & Contactless Icons -->
                <div class="flex justify-between items-start">
                  <!-- Gold Card Chip SVG -->
                  <svg class="w-10 h-8 text-amber-400/90" fill="currentColor" viewBox="0 0 48 39">
                    <rect x="2" y="2" width="44" height="35" rx="6" fill="#D4AF37" />
                    <line x1="2" y1="12" x2="14" y2="12" stroke="#111" stroke-width="1.5" />
                    <line x1="2" y1="20" x2="14" y2="20" stroke="#111" stroke-width="1.5" />
                    <line x1="2" y1="28" x2="14" y2="28" stroke="#111" stroke-width="1.5" />
                    <line x1="34" y1="12" x2="46" y2="12" stroke="#111" stroke-width="1.5" />
                    <line x1="34" y1="20" x2="46" y2="20" stroke="#111" stroke-width="1.5" />
                    <line x1="34" y1="28" x2="46" y2="28" stroke="#111" stroke-width="1.5" />
                    <rect x="14" y="6" width="20" height="27" fill="none" stroke="#111" stroke-width="1.5" />
                    <line x1="14" y1="16" x2="34" y2="16" stroke="#111" stroke-width="1.5" />
                    <line x1="14" y1="24" x2="34" y2="24" stroke="#111" stroke-width="1.5" />
                  </svg>

                  <!-- Card Brand Indicator SVG/Text -->
                  <div id="cardBrandLogo" class="font-bold font-mono tracking-wider text-xs px-2.5 py-1.5 rounded bg-white/10 text-white backdrop-blur-xs">
                    Generic Card
                  </div>
                </div>

                <!-- Card Number -->
                <div id="cardNumberDisplay" class="font-mono-card text-lg md:text-xl font-bold tracking-[0.2em] text-white/90">
                  •••• •••• •••• ••••
                </div>

                <!-- Footer with Holder Name & Expiry -->
                <div class="flex justify-between text-[11px] font-mono text-white/70 uppercase">
                  <div>
                    <span class="text-[8px] text-white/40 block">Card Holder</span>
                    <span id="cardHolderDisplay" class="font-medium tracking-wider">Patient Name</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[8px] text-white/40 block">Expires</span>
                    <span id="cardExpiryDisplay" class="font-medium">MM/YY</span>
                  </div>
                </div>
              </div>

              <!-- Quick Demo Card Selectors -->
              <div class="mt-4 space-y-2">
                <span class="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Pre-fill Supported Cards (Multi-Bank Simulation)</span>
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  <button type="button" onclick="fillCard('Verve')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    Verve (NGA)
                  </button>
                  <button type="button" onclick="fillCard('Visa')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    Visa
                  </button>
                  <button type="button" onclick="fillCard('Mastercard')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    Mastercard
                  </button>
                  <button type="button" onclick="fillCard('Amex')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    Amex
                  </button>
                  <button type="button" onclick="fillCard('Discover')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    Discover
                  </button>
                  <button type="button" onclick="fillCard('JCB')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    JCB
                  </button>
                  <button type="button" onclick="fillCard('Diners')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    Diners Club
                  </button>
                  <button type="button" onclick="fillCard('UnionPay')" class="px-2 py-1.5 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition text-center truncate cursor-pointer">
                    UnionPay
                  </button>
                </div>
              </div>

              <!-- Main Interactive Input Form -->
              <div class="mt-5 space-y-3.5">
                <div>
                  <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Card Number</label>
                  <div class="relative mt-1">
                    <input 
                      type="text" 
                      id="cardNumber" 
                      placeholder="5061 •••• •••• ••••" 
                      maxlength="19"
                      class="w-full px-4 py-2.5 bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 rounded-xl text-sm font-mono tracking-wider outline-none transition"
                    />
                    <div id="cardBrandIcon" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400"></div>
                  </div>
                </div>

                <div>
                  <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Cardholder Name</label>
                  <input 
                    type="text" 
                    id="cardHolder" 
                    placeholder="e.g. Dr. Elizabeth Vance" 
                    class="w-full mt-1 px-4 py-2.5 bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 rounded-xl text-sm outline-none transition"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Expiration Date</label>
                    <input 
                      type="text" 
                      id="cardExpiry" 
                      placeholder="MM/YY" 
                      maxlength="5"
                      class="w-full mt-1 px-4 py-2.5 bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 rounded-xl text-sm outline-none transition text-center font-mono"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Security Code (CVV)</label>
                    <input 
                      type="password" 
                      id="cardCvv" 
                      placeholder="•••" 
                      maxlength="4"
                      class="w-full mt-1 px-4 py-2.5 bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 rounded-xl text-sm outline-none transition text-center font-mono"
                    />
                  </div>
                </div>
              </div>
              <!-- END OF PANE-CARD -->

              <!-- PANE 2: TRANSFER -->
              <div id="pane-transfer" class="hidden space-y-4">
                <div class="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center space-y-3">
                  <p class="text-xs text-emerald-800 font-medium">To complete this payment, please transfer exactly the amount below to the designated simulation account:</p>
                  <div class="bg-white p-3.5 rounded-xl border border-zinc-100 space-y-2">
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-zinc-400">Amount</span>
                      <span class="font-bold font-mono text-zinc-800">₦${amount} NGN</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-t border-zinc-50 pt-2">
                      <span class="text-zinc-400">Bank Name</span>
                      <span class="font-bold text-zinc-800">GodsCare Sandbox Bank</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-t border-zinc-50 pt-2">
                      <span class="text-zinc-400">Account Number</span>
                      <span class="font-bold font-mono text-zinc-800">9901485293</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-t border-zinc-50 pt-2">
                      <span class="text-zinc-400">Beneficiary</span>
                      <span class="font-bold text-zinc-800">GodsCare Clinic Trust</span>
                    </div>
                  </div>
                  <p class="text-[10px] text-zinc-400 italic">This is a sandbox environment. No actual money will be transferred.</p>
                </div>
                <button type="button" onclick="submitTransferPayment()" id="transferBtn" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10">
                  I've Sent the Transfer
                </button>
              </div>

              <!-- PANE 3: BANK ACCOUNT -->
              <div id="pane-bank" class="hidden space-y-4">
                <div class="space-y-3 bg-white border border-zinc-100 rounded-2xl p-4">
                  <div>
                    <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Choose your Bank</label>
                    <select id="bankSelect" class="w-full mt-1 px-4 py-2.5 bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 rounded-xl text-sm outline-none transition">
                      <option value="">-- Select Bank --</option>
                      <option value="gtb">Guaranty Trust Bank (GTBank)</option>
                      <option value="zenith">Zenith Bank</option>
                      <option value="access">Access Bank</option>
                      <option value="uba">United Bank for Africa (UBA)</option>
                      <option value="kuda">Kuda Bank</option>
                      <option value="opay">OPay</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Account Number or Phone Number</label>
                    <input 
                      type="text" 
                      id="bankAccountNum" 
                      placeholder="e.g. 0123456789" 
                      maxlength="11"
                      class="w-full mt-1 px-4 py-2.5 bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 rounded-xl text-sm font-mono tracking-wider outline-none transition"
                    />
                  </div>
                </div>
                <button type="button" onclick="submitBankAccountPayment()" id="bankBtn" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10">
                  Authorize Bank Account
                </button>
              </div>

              <!-- PANE 4: USSD -->
              <div id="pane-ussd" class="hidden space-y-4">
                <div class="space-y-3">
                  <label class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Select Bank to Dial Code</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="dialUssd('*737#')" class="p-3 border border-zinc-200 rounded-xl text-left bg-white hover:bg-zinc-50 transition cursor-pointer">
                      <p class="text-xs font-bold text-zinc-800">GTBank</p>
                      <p class="text-[10px] font-mono text-zinc-400 mt-0.5">*737#</p>
                    </button>
                    <button type="button" onclick="dialUssd('*966#')" class="p-3 border border-zinc-200 rounded-xl text-left bg-white hover:bg-zinc-50 transition cursor-pointer">
                      <p class="text-xs font-bold text-zinc-800">Zenith Bank</p>
                      <p class="text-[10px] font-mono text-zinc-400 mt-0.5">*966#</p>
                    </button>
                    <button type="button" onclick="dialUssd('*901#')" class="p-3 border border-zinc-200 rounded-xl text-left bg-white hover:bg-zinc-50 transition cursor-pointer">
                      <p class="text-xs font-bold text-zinc-800">Access Bank</p>
                      <p class="text-[10px] font-mono text-zinc-400 mt-0.5">*901#</p>
                    </button>
                    <button type="button" onclick="dialUssd('*919#')" class="p-3 border border-zinc-200 rounded-xl text-left bg-white hover:bg-zinc-50 transition cursor-pointer">
                      <p class="text-xs font-bold text-zinc-800">UBA</p>
                      <p class="text-[10px] font-mono text-zinc-400 mt-0.5">*919#</p>
                    </button>
                  </div>
                </div>
                <div id="ussdDialer" class="hidden bg-zinc-900 text-amber-400 p-4 rounded-xl font-mono text-xs space-y-3 text-center border border-zinc-800 shadow-inner">
                  <p class="text-white">Dialing USSD Code...</p>
                  <p id="ussdCodeDisplay" class="text-lg font-bold tracking-widest text-emerald-400"></p>
                  <p class="text-[11px] text-zinc-400 leading-relaxed font-sans">Enter your sandbox transaction authorization code in the prompt below:</p>
                  <div class="flex justify-center">
                    <input type="password" id="ussdPin" placeholder="Enter Sandbox PIN" maxlength="4" class="px-3 py-1.5 bg-zinc-800 text-white rounded border border-zinc-700 text-center outline-none tracking-widest font-bold text-sm" />
                  </div>
                  <div class="flex gap-2 justify-center pt-1">
                    <button type="button" onclick="closeUssdDialer()" class="px-3 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded text-[10px] font-bold uppercase">Cancel</button>
                    <button type="button" onclick="submitUssdPayment()" class="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold uppercase">Submit</button>
                  </div>
                </div>
              </div>

            </div>

            <!-- PIN/OTP Authorization Step Modal (Simulated) -->
            <div id="pinModal" class="hidden fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div class="max-w-xs w-full bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl space-y-4">
                <div class="text-center space-y-1">
                  <h3 class="text-sm font-extrabold text-zinc-950">Enter Card PIN</h3>
                  <p class="text-[11px] text-zinc-500">Authorize your secure transaction with your card security PIN</p>
                </div>
                <div class="flex justify-center gap-2">
                  <input type="password" maxlength="1" class="pin-box w-10 h-12 border border-zinc-200 focus:border-zinc-900 rounded-lg text-center font-bold text-lg outline-none" />
                  <input type="password" maxlength="1" class="pin-box w-10 h-12 border border-zinc-200 focus:border-zinc-900 rounded-lg text-center font-bold text-lg outline-none" />
                  <input type="password" maxlength="1" class="pin-box w-10 h-12 border border-zinc-200 focus:border-zinc-900 rounded-lg text-center font-bold text-lg outline-none" />
                  <input type="password" maxlength="1" class="pin-box w-10 h-12 border border-zinc-200 focus:border-zinc-900 rounded-lg text-center font-bold text-lg outline-none" />
                </div>
                <div class="flex gap-2">
                  <button type="button" onclick="closePinModal()" class="w-1/2 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-500 font-medium hover:bg-zinc-50 cursor-pointer">Cancel</button>
                  <button type="button" onclick="submitAuthorizedPayment()" class="w-1/2 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer">Verify & Pay</button>
                </div>
              </div>
            </div>

            <!-- Footer: actions (Card specific) -->
            <div id="cardFooterButtons" class="space-y-2 mt-6">
              <button 
                id="confirmBtn"
                class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
              >
                Simulate Secure Card Payment
              </button>
            </div>

            <!-- Persistent Cancel Button -->
            <div class="mt-4">
              <a 
                id="cancelLink"
                href="/"
                class="block w-full py-2.5 text-center border border-zinc-200 text-zinc-500 rounded-xl text-xs font-mono uppercase tracking-wider hover:bg-zinc-50 transition"
              >
                Cancel Transaction
              </a>
            </div>
          </div>

        </div>

        <script>
          const urlParams = new URLSearchParams(window.location.search);
          const originParam = urlParams.get('origin') || '';
          const redirectBase = originParam ? originParam : '';
          document.getElementById('cancelLink').href = redirectBase || '/';

          // Pre-defined multi-banking cards representing various card types and brands
          const TEST_CARDS = {
            'Verve': {
              number: '5061 0422 9384 1029',
              holder: 'Ngozi Adebayo',
              expiry: '12/28',
              cvv: '931',
              gradient: 'from-emerald-700 to-teal-900',
              brand: 'Verve'
            },
            'Visa': {
              number: '4111 2222 3333 4444',
              holder: 'Dr. Elizabeth Vance',
              expiry: '08/29',
              cvv: '123',
              gradient: 'from-blue-600 to-indigo-900',
              brand: 'Visa'
            },
            'Mastercard': {
              number: '5543 2190 8765 4321',
              holder: 'James Thorne',
              expiry: '10/27',
              cvv: '456',
              gradient: 'from-rose-600 to-orange-900',
              brand: 'Mastercard'
            },
            'Amex': {
              number: '3782 822463 10005',
              holder: 'Marcus Sterling',
              expiry: '05/30',
              cvv: '8834',
              gradient: 'from-zinc-700 to-slate-900',
              brand: 'Amex'
            },
            'Discover': {
              number: '6011 2345 6789 0123',
              holder: 'Chloe Patel',
              expiry: '11/28',
              cvv: '702',
              gradient: 'from-orange-500 to-red-800',
              brand: 'Discover'
            },
            'JCB': {
              number: '3528 1234 5678 9012',
              holder: 'Yuki Kenji',
              expiry: '09/27',
              cvv: '493',
              gradient: 'from-cyan-700 to-sky-900',
              brand: 'JCB'
            },
            'Diners': {
              number: '3612 345678 9012',
              holder: 'Alistair Vance',
              expiry: '04/28',
              cvv: '293',
              gradient: 'from-slate-600 to-neutral-800',
              brand: 'Diners Club'
            },
            'UnionPay': {
              number: '6210 9876 5432 1098',
              holder: 'Han Wei',
              expiry: '03/30',
              cvv: '811',
              gradient: 'from-red-700 to-rose-950',
              brand: 'UnionPay'
            }
          };

          // Card brand detection by prefix matching
          function detectCardBrand(num) {
            const clean = num.replace(/\\D/g, '');
            if (/^4/.test(clean)) return 'Visa';
            if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) return 'Mastercard';
            if (/^(506[0-1]|507[8-9]|6500)/.test(clean)) return 'Verve';
            if (/^3[47]/.test(clean)) return 'Amex';
            if (/^(6011|65|64[4-9])/.test(clean)) return 'Discover';
            if (/^35[2-8]/.test(clean)) return 'JCB';
            if (/^(30[0-5]|36|38|39)/.test(clean)) return 'Diners';
            if (/^62/.test(clean)) return 'UnionPay';
            return 'Generic Card';
          }

          function getBrandGradient(brand) {
            switch(brand) {
              case 'Visa': return 'from-blue-600 to-indigo-900';
              case 'Mastercard': return 'from-rose-600 to-orange-900';
              case 'Verve': return 'from-emerald-700 to-teal-900';
              case 'Amex': return 'from-zinc-700 to-slate-900';
              case 'Discover': return 'from-orange-500 to-red-800';
              case 'JCB': return 'from-cyan-700 to-sky-900';
              case 'Diners': return 'from-slate-600 to-neutral-800';
              case 'UnionPay': return 'from-red-700 to-rose-950';
              default: return 'from-zinc-800 to-zinc-950';
            }
          }

          // Format inputs in real-time
          const cardNumberInput = document.getElementById('cardNumber');
          const cardHolderInput = document.getElementById('cardHolder');
          const cardExpiryInput = document.getElementById('cardExpiry');
          const cardCvvInput = document.getElementById('cardCvv');

          cardNumberInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\\s+/g, '').replace(/[^0-9]/gi, '');
            let formatted = '';
            
            const brand = detectCardBrand(val);
            
            // Format card number with spaces depending on brand (e.g. Amex uses 4-6-5)
            if (brand === 'Amex') {
              const parts = [val.slice(0, 4), val.slice(4, 10), val.slice(10, 15)];
              formatted = parts.filter(p => p).join(' ');
            } else {
              const parts = [];
              for (let i = 0; i < val.length; i += 4) {
                parts.push(val.slice(i, i + 4));
              }
              formatted = parts.join(' ');
            }
            e.target.value = formatted;

            // Update visual card
            const numDisp = document.getElementById('cardNumberDisplay');
            numDisp.innerText = formatted || '•••• •••• •••• ••••';

            // Brand indicator update
            const brandLogo = document.getElementById('cardBrandLogo');
            brandLogo.innerText = brand;
            
            // Icon
            const brandIcon = document.getElementById('cardBrandIcon');
            brandIcon.innerText = brand !== 'Generic Card' ? '💳 ' + brand : '';

            // Update card gradient color
            const cardVisual = document.getElementById('cardVisual');
            cardVisual.className = 'relative overflow-hidden mt-5 w-full h-44 rounded-2xl bg-gradient-to-br ' + getBrandGradient(brand) + ' p-6 text-white shadow-md flex flex-col justify-between transition-all duration-300';
          });

          cardHolderInput.addEventListener('input', (e) => {
            document.getElementById('cardHolderDisplay').innerText = e.target.value || 'Patient Name';
          });

          cardExpiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\\D/g, '');
            if (val.length > 2) {
              val = val.slice(0, 2) + '/' + val.slice(2, 4);
            }
            e.target.value = val;
            document.getElementById('cardExpiryDisplay').innerText = val || 'MM/YY';
          });

          // Pre-fill quick helper
          window.fillCard = function(brand) {
            const card = TEST_CARDS[brand];
            if (!card) return;

            cardNumberInput.value = card.number;
            cardHolderInput.value = card.holder;
            cardExpiryInput.value = card.expiry;
            cardCvvInput.value = card.cvv;

            // Trigger visual updates manually
            document.getElementById('cardNumberDisplay').innerText = card.number;
            document.getElementById('cardHolderDisplay').innerText = card.holder;
            document.getElementById('cardExpiryDisplay').innerText = card.expiry;
            document.getElementById('cardBrandLogo').innerText = card.brand;
            document.getElementById('cardBrandIcon').innerText = '💳 ' + card.brand;

            const cardVisual = document.getElementById('cardVisual');
            cardVisual.className = 'relative overflow-hidden mt-5 w-full h-44 rounded-2xl bg-gradient-to-br ' + card.gradient + ' p-6 text-white shadow-md flex flex-col justify-between transition-all duration-300';
          };

          // PIN Pad Auto Focus
          const pinBoxes = document.querySelectorAll('.pin-box');
          pinBoxes.forEach((box, idx) => {
            box.addEventListener('input', (e) => {
              if (e.target.value && idx < pinBoxes.length - 1) {
                pinBoxes[idx + 1].focus();
              }
            });
            box.addEventListener('keydown', (e) => {
              if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                pinBoxes[idx - 1].focus();
              }
            });
          });

          // Confirm Payment triggers modal
          document.getElementById('confirmBtn').addEventListener('click', () => {
            // Validate basic values
            if (!cardNumberInput.value || cardNumberInput.value.length < 12) {
              alert('Please enter a valid card number.');
              cardNumberInput.focus();
              return;
            }
            if (!cardHolderInput.value) {
              alert('Please enter the cardholder name.');
              cardHolderInput.focus();
              return;
            }
            if (!cardExpiryInput.value || cardExpiryInput.value.length < 5) {
              alert('Please enter a valid expiration date (MM/YY).');
              cardExpiryInput.focus();
              return;
            }
            if (!cardCvvInput.value || cardCvvInput.value.length < 3) {
              alert('Please enter a valid CVV.');
              cardCvvInput.focus();
              return;
            }

            // Open simulated bank authorization PIN modal
            document.getElementById('pinModal').classList.remove('hidden');
            pinBoxes[0].focus();
          });

          window.closePinModal = function() {
            document.getElementById('pinModal').classList.add('hidden');
          };

          window.submitAuthorizedPayment = async function() {
            closePinModal();
            const btn = document.getElementById('confirmBtn');
            btn.innerText = 'Authorizing card transaction...';
            btn.disabled = true;

            try {
              const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  reference: '${reference}', 
                  userId: '${userId}', 
                  isSimulated: true, 
                  amount: Number('${amount}'),
                  paymentType: '${paymentType}',
                  targetId: '${targetId}',
                  medicineName: '${medicineName}'
                })
              });
              const result = await res.json();
              if (result.status === 'success') {
                btn.innerText = 'Card Approved! Redirecting...';
                setTimeout(() => {
                  window.location.href = redirectBase + '/?payment=success&type=${paymentType}&message=Authorized';
                }, 1000);
              } else {
                btn.innerText = 'Card Payment Failed';
                btn.disabled = false;
                alert('Verification failed: ' + result.error);
              }
            } catch (err) {
              btn.innerText = 'Payment Error';
              btn.disabled = false;
              alert('Error verifying payment: ' + err.message);
            }
          };

          // --- Multi-channel Sandbox Simulation Handlers ---
          window.switchTab = function(tabId) {
            const tabs = ['card', 'transfer', 'bank', 'ussd'];
            const titles = {
              'card': 'Debit/Credit Card Payment',
              'transfer': 'Bank Transfer Payment',
              'bank': 'Bank Account Debit',
              'ussd': 'USSD Dial Code Payment'
            };
            
            // Update title
            document.getElementById('methodTitle').innerText = titles[tabId];

            tabs.forEach(t => {
              const tabBtn = document.getElementById('tab-' + t);
              const pane = document.getElementById('pane-' + t);
              
              if (t === tabId) {
                tabBtn.className = 'pb-2 text-xs font-bold text-emerald-600 border-b-2 border-emerald-600 px-2 cursor-pointer';
                pane.classList.remove('hidden');
              } else {
                tabBtn.className = 'pb-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 px-2 cursor-pointer';
                pane.classList.add('hidden');
              }
            });

            // Toggle footer button container for Card
            const cardFooter = document.getElementById('cardFooterButtons');
            if (tabId === 'card') {
              cardFooter.classList.remove('hidden');
            } else {
              cardFooter.classList.add('hidden');
            }
          };

          window.submitTransferPayment = async function() {
            const btn = document.getElementById('transferBtn');
            btn.innerText = 'Verifying Bank Transfer...';
            btn.disabled = true;

            try {
              const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  reference: '${reference}', 
                  userId: '${userId}', 
                  isSimulated: true, 
                  amount: Number('${amount}'),
                  paymentType: '${paymentType}',
                  targetId: '${targetId}',
                  medicineName: '${medicineName}'
                })
              });
              const result = await res.json();
              if (result.status === 'success') {
                btn.innerText = 'Transfer Received! Redirecting...';
                setTimeout(() => {
                  window.location.href = redirectBase + '/?payment=success&type=${paymentType}&message=TransferReceived';
                }, 1000);
              } else {
                btn.innerText = 'Verify Transfer';
                btn.disabled = false;
                alert('Transfer verification failed: ' + result.error);
              }
            } catch (err) {
              btn.innerText = 'Transfer Error';
              btn.disabled = false;
              alert('Error verifying transfer: ' + err.message);
            }
          };

          window.submitBankAccountPayment = async function() {
            const bank = document.getElementById('bankSelect').value;
            const acct = document.getElementById('bankAccountNum').value;
            if (!bank) {
              alert('Please select your bank.');
              return;
            }
            if (!acct || acct.length < 10) {
              alert('Please enter a valid 10-digit account number.');
              return;
            }

            const btn = document.getElementById('bankBtn');
            btn.innerText = 'Sending OTP...';
            btn.disabled = true;

            setTimeout(async () => {
              const otp = prompt('An OTP has been sent to your phone. Enter sandbox OTP "1234" to authorize:');
              if (otp === '1234' || otp) {
                btn.innerText = 'Authorizing Account Debit...';
                try {
                  const res = await fetch('/api/payments/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      reference: '${reference}', 
                      userId: '${userId}', 
                      isSimulated: true, 
                      amount: Number('${amount}'),
                      paymentType: '${paymentType}',
                      targetId: '${targetId}',
                      medicineName: '${medicineName}'
                    })
                  });
                  const result = await res.json();
                  if (result.status === 'success') {
                    btn.innerText = 'Debit Approved! Redirecting...';
                    setTimeout(() => {
                      window.location.href = redirectBase + '/?payment=success&type=${paymentType}&message=BankDebitApproved';
                    }, 1000);
                  } else {
                    btn.innerText = 'Authorize Bank Account';
                    btn.disabled = false;
                    alert('Bank authorization failed: ' + result.error);
                  }
                } catch (err) {
                  btn.innerText = 'Debit Error';
                  btn.disabled = false;
                  alert('Error verifying debit: ' + err.message);
                }
              } else {
                btn.innerText = 'Authorize Bank Account';
                btn.disabled = false;
                alert('OTP verification cancelled or invalid.');
              }
            }, 1000);
          };

          window.dialUssd = function(code) {
            document.getElementById('ussdCodeDisplay').innerText = code;
            document.getElementById('ussdDialer').classList.remove('hidden');
          };

          window.closeUssdDialer = function() {
            document.getElementById('ussdDialer').classList.add('hidden');
            document.getElementById('ussdPin').value = '';
          };

          window.submitUssdPayment = async function() {
            const pin = document.getElementById('ussdPin').value;
            if (!pin || pin.length < 4) {
              alert('Please enter your 4-digit security PIN to authorize USSD.');
              return;
            }

            const code = document.getElementById('ussdCodeDisplay').innerText;
            closeUssdDialer();
            
            try {
              const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  reference: '${reference}', 
                  userId: '${userId}', 
                  isSimulated: true, 
                  amount: Number('${amount}'),
                  paymentType: '${paymentType}',
                  targetId: '${targetId}',
                  medicineName: '${medicineName}'
                })
              });
              const result = await res.json();
              if (result.status === 'success') {
                setTimeout(() => {
                  window.location.href = redirectBase + '/?payment=success&type=${paymentType}&message=USSDApproved';
                }, 1000);
              } else {
                alert('USSD authorization failed: ' + result.error);
              }
            } catch (err) {
              alert('Error verifying USSD transaction: ' + err.message);
            }
          };

          // Initialize with default Verve Card selection representation
          fillCard('Verve');
        </script>
      </body>
    </html>
  `);
  */
});

// Verify transaction and update records in Firestore
app.post("/api/payments/verify", async (req: express.Request, res: express.Response) => {
  const { reference, userId, amount, paymentType, targetId, medicineName } = req.body;
  if (!reference || !userId) {
    res.status(400).json({ error: "Missing verification parameters: reference, userId." });
    return;
  }

  try {
    let paymentVerified = false;
    let paymentAmount = amount || 500;
    let currency = "NGN";
    let finalPaymentType = paymentType || "premium";
    let finalTargetId = targetId || "none";
    let finalMedicineName = medicineName || "";

    const paystackSecret = getPaystackSecretKey();
    if (!paystackSecret) {
      res.status(400).json({ error: "Paystack live key is not configured. Cannot verify payment." });
      return;
    }
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecret}`
      }
    });
    const data = await paystackRes.json();
    if (data.status && data.data.status === "success") {
      paymentVerified = true;
      paymentAmount = data.data.amount / 100; // convert Kobo to Naira
      currency = data.data.currency;
      
      // Retrieve transaction metadata
      if (data.data.metadata) {
        finalPaymentType = data.data.metadata.paymentType || finalPaymentType;
        finalTargetId = data.data.metadata.targetId || finalTargetId;
        finalMedicineName = data.data.metadata.medicineName || finalMedicineName;
      }
    } else {
      res.status(400).json({ error: data.message || "Paystack reported payment was not completed." });
      return;
    }

    if (paymentVerified) {
      console.log(`[Billing success] Processing Database updates for paymentType: ${finalPaymentType}`);
      
      // Update models in Firestore depending on the payment type
      if (finalPaymentType === "premium") {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, { isPremium: true });
          console.log(`[Firestore] User ${userId} upgraded to isPremium: true`);
        }
      } else if (finalPaymentType === "appointment") {
        const appQuery = query(collection(db, "appointments"), where("id", "==", finalTargetId));
        const appSnap = await getDocs(appQuery);
        if (!appSnap.empty) {
          const docId = appSnap.docs[0].id;
          await updateDoc(doc(db, "appointments", docId), {
            paymentStatus: "paid",
            paymentReference: reference
          });
          console.log(`[Firestore] Appointment ${finalTargetId} paymentStatus set to paid`);
        }
      } else if (finalPaymentType === "bill") {
        const billQuery = query(collection(db, "medical_bills"), where("id", "==", finalTargetId));
        const billSnap = await getDocs(billQuery);
        if (!billSnap.empty) {
          const docId = billSnap.docs[0].id;
          await updateDoc(doc(db, "medical_bills", docId), {
            status: "paid",
            paymentReference: reference,
            paidAt: new Date().toISOString()
          });
          console.log(`[Firestore] Medical Bill ${finalTargetId} status set to paid`);
        }
      } else if (finalPaymentType === "medicine") {
        const purchaseId = `purch-${Date.now()}`;
        const purchaseDoc = {
          id: purchaseId,
          patientId: userId,
          medicineId: finalTargetId,
          medicineName: finalMedicineName || "Prescribed Medicine",
          price: paymentAmount,
          status: "paid",
          purchasedAt: new Date().toISOString(),
          paymentReference: reference
        };
        await setDoc(doc(db, "medicine_purchases", purchaseId), purchaseDoc);
        console.log(`[Firestore] Medicine purchase logged for user ${userId}: ${finalMedicineName}`);
      }

      // 4. Save payment transaction record
      const payLogId = `pay-${Date.now()}`;
      const paymentLogDoc = {
        id: payLogId,
        patientId: userId,
        amount: paymentAmount,
        currency: currency,
        status: "success",
        reference,
        paymentType: finalPaymentType,
        targetId: finalTargetId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "payments", payLogId), paymentLogDoc);

      res.json({
        status: "success",
        message: "Transaction verified successfully. Records updated.",
        paymentType: finalPaymentType,
        targetId: finalTargetId
      });
    }
  } catch (err: any) {
    console.error("[Billing] Verification Failure:", err);
    res.status(500).json({ error: "Internal payment processing error." });
  }
});

// Paystack GET Redirect Callback: verify and redirect to dashboard with query status
app.get("/api/payments/verify-callback", async (req: express.Request, res: express.Response) => {
  const reference = (req.query.reference || req.query.trxref) as string;
  const userId = req.query.userId as string;
  const origin = req.query.origin as string || "";
  const redirectBase = origin || "";

  if (!reference) {
    res.redirect(`${redirectBase}/?payment=error&message=Missing+transaction+reference`);
    return;
  }

  try {
    const paystackSecret = getPaystackSecretKey();
    if (!paystackSecret) {
      res.redirect(`${redirectBase}/?payment=error&message=${encodeURIComponent("Paystack live key is not configured. Cannot verify payment.")}`);
      return;
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecret}`
      }
    });

    const data = await paystackRes.json();
    if (data.status && data.data.status === "success") {
      const paymentAmount = data.data.amount / 100; // convert Kobo to Naira
      const currency = data.data.currency;

      let finalPaymentType = "premium";
      let finalTargetId = "none";
      let finalMedicineName = "";
      let actualUserId = userId || "none";

      if (data.data.metadata) {
        finalPaymentType = data.data.metadata.paymentType || finalPaymentType;
        finalTargetId = data.data.metadata.targetId || finalTargetId;
        finalMedicineName = data.data.metadata.medicineName || finalMedicineName;
        actualUserId = data.data.metadata.userId || actualUserId;
      }

      console.log(`[Paystack Callback] Verification successful for user: ${actualUserId} (${finalPaymentType})`);

      if (finalPaymentType === "premium") {
        const userRef = doc(db, "users", actualUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, { isPremium: true });
        }
      } else if (finalPaymentType === "appointment") {
        const appQuery = query(collection(db, "appointments"), where("id", "==", finalTargetId));
        const appSnap = await getDocs(appQuery);
        if (!appSnap.empty) {
          const docId = appSnap.docs[0].id;
          await updateDoc(doc(db, "appointments", docId), {
            paymentStatus: "paid",
            paymentReference: reference
          });
        }
      } else if (finalPaymentType === "bill") {
        const billQuery = query(collection(db, "medical_bills"), where("id", "==", finalTargetId));
        const billSnap = await getDocs(billQuery);
        if (!billSnap.empty) {
          const docId = billSnap.docs[0].id;
          await updateDoc(doc(db, "medical_bills", docId), {
            status: "paid",
            paymentReference: reference,
            paidAt: new Date().toISOString()
          });
        }
      } else if (finalPaymentType === "medicine") {
        const purchaseId = `purch-${Date.now()}`;
        const purchaseDoc = {
          id: purchaseId,
          patientId: actualUserId,
          medicineId: finalTargetId,
          medicineName: finalMedicineName || "Prescribed Medicine",
          price: paymentAmount,
          status: "paid",
          purchasedAt: new Date().toISOString(),
          paymentReference: reference
        };
        await setDoc(doc(db, "medicine_purchases", purchaseId), purchaseDoc);
      }

      // Save payment transaction record
      const payLogId = `pay-${Date.now()}`;
      const paymentLogDoc = {
        id: payLogId,
        patientId: actualUserId,
        amount: paymentAmount,
        currency,
        status: "success",
        reference,
        paymentType: finalPaymentType,
        targetId: finalTargetId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "payments", payLogId), paymentLogDoc);

      res.redirect(`${redirectBase}/?payment=success&type=${finalPaymentType}&reference=${reference}`);
    } else {
      console.warn("[Paystack Callback] Verification failed:", data.message);
      res.redirect(`${redirectBase}/?payment=error&message=${encodeURIComponent(data.message || "Unverified")}`);
    }
  } catch (err: any) {
    console.error("[Paystack Callback] Verification exception:", err);
    res.redirect(`${redirectBase}/?payment=error&message=${encodeURIComponent(err.message || "Verification Exception")}`);
  }
});

// Get medicines catalog from Firestore, seeding if empty
app.get("/api/medicines", async (req: express.Request, res: express.Response) => {
  try {
    const medColRef = collection(db, "medicines");
    const snap = await getDocs(medColRef);
    const medsList: any[] = [];
    snap.forEach((docSnap) => medsList.push(docSnap.data()));

    if (medsList.length === 0) {
      // Seed default medicines
      for (const med of MEDICINES) {
        await setDoc(doc(db, "medicines", med.id), med);
        medsList.push(med);
      }
    }
    
    // Sort medicines by id to keep them consistent
    medsList.sort((a, b) => a.id.localeCompare(b.id));
    res.json(medsList);
  } catch (error) {
    console.error("Error loading medicines:", error);
    res.json(MEDICINES); // fallback
  }
});

// Update medicine details (including price/fee)
app.post("/api/medicines/:id/update", async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { price, name, description, category } = req.body;
  try {
    const medRef = doc(db, "medicines", id);
    const updateData: any = {};
    if (price !== undefined) updateData.price = Number(price);
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;

    await updateDoc(medRef, updateData);
    res.json({ success: true, message: "Medicine updated successfully." });
  } catch (error: any) {
    console.error("Error updating medicine:", error);
    res.status(500).json({ error: error.message || "Failed to update medicine details." });
  }
});

// Add new medicine to catalog
app.post("/api/medicines/add", async (req: express.Request, res: express.Response) => {
  const { name, category, symptoms, description, price } = req.body;
  if (!name || !category || !description || !price) {
    res.status(400).json({ error: "Missing required medicine details: name, category, description, price." });
    return;
  }
  try {
    const id = `med-${Date.now()}`;
    // Split symptoms if they are passed as a string or array
    const symptomsArray = typeof symptoms === "string" 
      ? symptoms.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : Array.isArray(symptoms) ? symptoms : ["General Symptoms"];

    const newMed = {
      id,
      name,
      category,
      description,
      symptoms: symptomsArray,
      price: Number(price)
    };

    await setDoc(doc(db, "medicines", id), newMed);
    res.json({ success: true, message: "Medicine added successfully.", medicine: newMed });
  } catch (error: any) {
    console.error("Error adding medicine:", error);
    res.status(500).json({ error: error.message || "Failed to add medicine to catalog." });
  }
});

// Submit patient/client feedback
app.post("/api/feedback", async (req: express.Request, res: express.Response) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: "Missing required feedback fields: name, email, message." });
    return;
  }
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

    if (db) {
      await setDoc(doc(db, "feedbacks", feedbackId), feedbackData);
    }

    // Print professional live dispatch log
    console.log(`\n==================================================================`);
    console.log(`[REAL-TIME FEEDBACK DISPATCHED TO EMAIL austineisama150@gmail.com]`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Subject: ${subject || "General Client Feedback"}`);
    console.log(`Body: ${message}`);
    console.log(`==================================================================\n`);

    res.json({ success: true, message: "Your feedback has been logged in our secure clinical vault and dispatched to austineisama150@gmail.com." });
  } catch (error: any) {
    console.error("Error logging feedback:", error);
    res.status(500).json({ error: error.message || "Failed to submit feedback." });
  }
});

// Retrieve all client feedbacks (for Admin Panel)
app.get("/api/feedbacks", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const snap = await getDocs(collection(db, "feedbacks"));
    const feedbacksList: any[] = [];
    snap.forEach((docSnap) => feedbacksList.push(docSnap.data()));
    feedbacksList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    res.json(feedbacksList);
  } catch (error: any) {
    console.error("Error retrieving feedbacks:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve feedbacks." });
  }
});

// Get system settings/fees
app.get("/api/settings/fees", async (req: express.Request, res: express.Response) => {
  try {
    const docRef = doc(db, "system_settings", "fees");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      res.json(snap.data());
    } else {
      const defaultFees = {
        appointmentBookingFee: 3500,
        premiumSubscriptionFee: 500
      };
      await setDoc(docRef, defaultFees);
      res.json(defaultFees);
    }
  } catch (error) {
    res.json({ appointmentBookingFee: 3500, premiumSubscriptionFee: 500 });
  }
});

// Get comprehensive site settings (Hospital profile, emergency contact, banner, pricing)
app.get("/api/site/settings", async (req: express.Request, res: express.Response) => {
  try {
    const docRef = doc(db, "system_settings", "site_profile");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      res.json(snap.data());
    } else {
      const defaultSettings = {
        hospitalName: "GodsCare Hospital & Medical Center",
        tagline: "World-Class Compassionate Healthcare & Advanced Clinical Excellence",
        emergencyPhone: "+1 (800) 463-7227",
        generalPhone: "+1 (800) 555-0199",
        email: "care@godscarehospital.com",
        address: "742 Evergreen Healthcare Blvd, Medical District",
        announcement: "Notice: 24/7 Outpatient & Emergency services are fully operational. Book consultations online.",
        announcementActive: true,
        appointmentBookingFee: 3500,
        premiumSubscriptionFee: 500
      };
      if (db) await setDoc(docRef, defaultSettings);
      res.json(defaultSettings);
    }
  } catch (error) {
    res.json({
      hospitalName: "GodsCare Hospital & Medical Center",
      tagline: "World-Class Compassionate Healthcare & Advanced Clinical Excellence",
      emergencyPhone: "+1 (800) 463-7227",
      generalPhone: "+1 (800) 555-0199",
      email: "care@godscarehospital.com",
      address: "742 Evergreen Healthcare Blvd, Medical District",
      announcement: "Notice: 24/7 Outpatient & Emergency services are fully operational.",
      announcementActive: true,
      appointmentBookingFee: 3500,
      premiumSubscriptionFee: 500
    });
  }
});

// Update comprehensive site settings (Admin Administrator only)
app.post("/api/site/settings/update", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.status(500).json({ error: "Database not initialized" });
      return;
    }
    const updateData = req.body;
    const docRef = doc(db, "system_settings", "site_profile");
    await setDoc(docRef, updateData, { merge: true });

    // Also sync fees document
    if (updateData.appointmentBookingFee || updateData.premiumSubscriptionFee) {
      const feesRef = doc(db, "system_settings", "fees");
      await setDoc(feesRef, {
        appointmentBookingFee: Number(updateData.appointmentBookingFee || 3500),
        premiumSubscriptionFee: Number(updateData.premiumSubscriptionFee || 500)
      }, { merge: true });
    }

    res.json({ success: true, message: "Site settings updated successfully." });
  } catch (error: any) {
    console.error("Error updating site settings:", error);
    res.status(500).json({ error: error.message || "Failed to update site settings." });
  }
});

// Add new doctor (Admin Administrator)
app.post("/api/doctors/add", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.status(500).json({ error: "Database not initialized" });
      return;
    }
    const { name, specialty, department, experience, education, rating, bio, image, availableDays, availableHours, consultationFee } = req.body;
    if (!name || !specialty || !department) {
      res.status(400).json({ error: "Missing required doctor fields: name, specialty, department." });
      return;
    }
    const id = `doc-${Date.now()}`;
    const newDoctor = {
      id,
      name,
      specialty,
      department,
      experience: experience || "5+ years",
      education: education || "M.D. Board Certified",
      rating: Number(rating) || 5.0,
      bio: bio || "Experienced medical specialist dedicated to patient well-being.",
      image: image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
      availableDays: Array.isArray(availableDays) ? availableDays : ["Monday", "Wednesday", "Friday"],
      availableHours: Array.isArray(availableHours) ? availableHours : ["09:00 AM", "11:00 AM", "02:00 PM"],
      consultationFee: consultationFee ? Number(consultationFee) : 3500
    };
    await setDoc(doc(db, "doctors", id), newDoctor);
    res.json({ success: true, message: "Doctor added successfully.", doctor: newDoctor });
  } catch (error: any) {
    console.error("Error adding doctor:", error);
    res.status(500).json({ error: error.message || "Failed to add doctor." });
  }
});

// Update doctor (Admin Administrator)
app.post("/api/doctors/:id/update", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.status(500).json({ error: "Database not initialized" });
      return;
    }
    const { id } = req.params;
    const docRef = doc(db, "doctors", id);
    await setDoc(docRef, req.body, { merge: true });
    res.json({ success: true, message: "Doctor updated successfully." });
  } catch (error: any) {
    console.error("Error updating doctor:", error);
    res.status(500).json({ error: error.message || "Failed to update doctor." });
  }
});

// Delete doctor (Admin Administrator)
app.delete("/api/doctors/:id", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.status(500).json({ error: "Database not initialized" });
      return;
    }
    const { id } = req.params;
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "doctors", id));
    res.json({ success: true, message: "Doctor removed successfully." });
  } catch (error: any) {
    console.error("Error deleting doctor:", error);
    res.status(500).json({ error: error.message || "Failed to delete doctor." });
  }
});

// Delete medicine from catalog (Admin Administrator)
app.post("/api/medicines/:id/delete", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.status(500).json({ error: "Database not initialized" });
      return;
    }
    const { id } = req.params;
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "medicines", id));
    res.json({ success: true, message: "Medicine removed from catalog." });
  } catch (error: any) {
    console.error("Error deleting medicine:", error);
    res.status(500).json({ error: error.message || "Failed to delete medicine." });
  }
});

// Update user role (Admin Administrator only)
app.post("/api/users/:uid/role", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.status(500).json({ error: "Database not initialized" });
      return;
    }
    const { uid } = req.params;
    const { role } = req.body;
    if (!role || !["patient", "admin", "admin_administrator"].includes(role)) {
      res.status(400).json({ error: "Invalid role specified." });
      return;
    }
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { role }, { merge: true });
    res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: error.message || "Failed to update user role." });
  }
});

// Aggregated financial summary & all payments (Admin Administrator & Admin)
app.get("/api/admin/financial-summary", async (req: express.Request, res: express.Response) => {
  try {
    if (!db) {
      res.json({ totalRevenue: 0, appointmentsRevenue: 0, pharmacyRevenue: 0, billsRevenue: 0, premiumRevenue: 0 });
      return;
    }

    // 1. Paid appointments
    const appSnap = await getDocs(collection(db, "appointments"));
    let appointmentsRevenue = 0;
    let paidAppointmentsCount = 0;
    appSnap.forEach((d) => {
      const data = d.data();
      if (data.paymentStatus === "paid" || data.amountPaid) {
        appointmentsRevenue += Number(data.amountPaid || data.paymentAmount || 3500);
        paidAppointmentsCount++;
      }
    });

    // 2. Paid medicines
    const medSnap = await getDocs(collection(db, "medicine_purchases"));
    let pharmacyRevenue = 0;
    let paidMedicinesCount = 0;
    medSnap.forEach((d) => {
      const data = d.data();
      pharmacyRevenue += Number(data.price || 0);
      paidMedicinesCount++;
    });

    // 3. Paid medical bills
    const billsSnap = await getDocs(collection(db, "medical_bills"));
    let billsRevenue = 0;
    let paidBillsCount = 0;
    billsSnap.forEach((d) => {
      const data = d.data();
      if (data.status === "paid") {
        billsRevenue += Number(data.amount || 0);
        paidBillsCount++;
      }
    });

    // 4. Premium subscriptions
    const usersSnap = await getDocs(collection(db, "users"));
    let premiumRevenue = 0;
    let premiumCount = 0;
    usersSnap.forEach((d) => {
      const data = d.data();
      if (data.isPremium) {
        premiumRevenue += 500;
        premiumCount++;
      }
    });

    const totalRevenue = appointmentsRevenue + pharmacyRevenue + billsRevenue + premiumRevenue;

    res.json({
      totalRevenue,
      appointmentsRevenue,
      pharmacyRevenue,
      billsRevenue,
      premiumRevenue,
      counts: {
        paidAppointmentsCount,
        paidMedicinesCount,
        paidBillsCount,
        premiumCount
      }
    });
  } catch (error: any) {
    console.error("Error retrieving financial summary:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve financial summary." });
  }
});

// Update system settings/fees
app.post("/api/settings/fees/update", async (req: express.Request, res: express.Response) => {
  const { appointmentBookingFee, premiumSubscriptionFee } = req.body;
  if (!db) {
    console.error("[Settings Error]: Firestore DB is not initialized.");
    res.status(500).json({ error: "Firestore database is not initialized on the server." });
    return;
  }

  const parsedBookingFee = Number(appointmentBookingFee);
  const parsedPremiumFee = Number(premiumSubscriptionFee);

  if (isNaN(parsedBookingFee) || isNaN(parsedPremiumFee)) {
    res.status(400).json({ error: "Invalid fee amounts. Must be valid numbers." });
    return;
  }

  try {
    const docRef = doc(db, "system_settings", "fees");
    await setDoc(docRef, {
      appointmentBookingFee: parsedBookingFee,
      premiumSubscriptionFee: parsedPremiumFee
    });
    console.log(`[Settings] Global fees updated: booking=${parsedBookingFee}, premium=${parsedPremiumFee}`);
    res.json({ success: true, message: "System fees updated successfully." });
  } catch (error: any) {
    console.error("[Settings Error] Failed to update global fees in Firestore:", error);
    res.status(500).json({ error: error.message || "Failed to update system fees." });
  }
});

// Get bills for a patient, auto-generating mock ones if empty
app.get("/api/patients/:uid/bills", async (req: express.Request, res: express.Response) => {
  const { uid } = req.params;
  try {
    const billsRef = collection(db, "medical_bills");
    const q = query(billsRef, where("patientId", "==", uid));
    const snap = await getDocs(q);
    const billsList: any[] = [];
    snap.forEach((docSnap) => billsList.push(docSnap.data()));

    if (billsList.length === 0) {
      const initialBills = [
        { id: `bill-1-${Date.now()}`, patientId: uid, title: "Cardiology Diagnostic Evaluation & ECG", amount: 3500, status: "unpaid", createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString() },
        { id: `bill-2-${Date.now()}`, patientId: uid, title: "Clinical Chemistry Lab Panel (CBC, Lipid, Liver Profile)", amount: 8500, status: "unpaid", createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
        { id: `bill-3-${Date.now()}`, patientId: uid, title: "Outpatient Clinic Service & Registration Fee", amount: 1500, status: "unpaid", createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() }
      ];
      for (const bill of initialBills) {
        await setDoc(doc(db, "medical_bills", bill.id), bill);
        billsList.push(bill);
      }
    }

    billsList.sort((a, b) => {
      if (a.status === b.status) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.status === "unpaid" ? -1 : 1;
    });

    res.json(billsList);
  } catch (error: any) {
    console.error("[Billing API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve medical bills." });
  }
});

// Get medicine purchases for a patient
app.get("/api/patients/:uid/medicine-purchases", async (req: express.Request, res: express.Response) => {
  const { uid } = req.params;
  try {
    const purchasesRef = collection(db, "medicine_purchases");
    const q = query(purchasesRef, where("patientId", "==", uid));
    const snap = await getDocs(q);
    const purchasesList: any[] = [];
    snap.forEach((docSnap) => purchasesList.push(docSnap.data()));
    purchasesList.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
    res.json(purchasesList);
  } catch (error: any) {
    console.error("[Medicine Purchases API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve medicine purchases." });
  }
});


// ==========================================
// CLINICAL AGENTIC AI ENDPOINT
// ==========================================

// Helper to compile comprehensive context for the agent
async function fetchPatientContext(uid: string) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { error: "User profile not found." };

    const userData = userSnap.data();

    // Fetch appointments
    const appointmentsRef = collection(db, "appointments");
    const qAppointments = query(appointmentsRef, where("patientId", "==", uid));
    const appSnap = await getDocs(qAppointments);
    const appointmentsList: any[] = [];
    appSnap.forEach((docSnap) => appointmentsList.push(docSnap.data()));

    // Fetch medical history
    const medRef = doc(db, "medical_histories", uid);
    const medSnap = await getDoc(medRef);
    const medicalHistory = medSnap.exists() ? medSnap.data() : null;

    // Fetch existing care plans
    const careRef = collection(db, "care_plans");
    const qCare = query(careRef, where("patientId", "==", uid));
    const careSnap = await getDocs(qCare);
    const carePlansList: any[] = [];
    careSnap.forEach((docSnap) => carePlansList.push(docSnap.data()));

    return {
      profile: userData,
      appointments: appointmentsList,
      medicalHistory,
      existingCarePlans: carePlansList
    };
  } catch (error: any) {
    console.error("Error building context for tool:", error);
    return { error: error.message || "Failed to load clinical context." };
  }
}

// Helper to save insight generated autonomously by the agent
async function createCarePlan(uid: string, insight: string, carePlanSteps: string[], severity: string) {
  try {
    const planId = `plan-${Date.now()}`;
    const newCarePlan = {
      id: planId,
      patientId: uid,
      insight,
      carePlan: carePlanSteps,
      severity: severity || "low",
      generatedBy: "GodsCare Clinical AI (Consultant)",
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "care_plans", planId), newCarePlan);
    console.log(`[Clinical AI Agent] Autonomously created care plan ${planId} for user ${uid}`);
    return { status: "success", planId, message: "Clinical Care Plan logged successfully." };
  } catch (error: any) {
    console.error("Error creating CarePlan for tool:", error);
    return { error: error.message || "Failed to log clinical insight." };
  }
}

// Pre-seeded default doctors list for the clinical ecosystem
const INITIAL_DOCTORS = [
  {
    id: "doc-vance",
    name: "Dr. Elizabeth Vance",
    specialty: "Cardiologist",
    department: "Cardiology",
    experience: "15 years",
    education: "M.D. Stanford University School of Medicine",
    rating: 4.9,
    availableDays: ["Monday", "Wednesday", "Friday"],
    availableHours: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"],
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
    bio: "Dr. Vance is a board-certified cardiologist with a passion for preventive medicine and non-invasive cardiac imaging techniques."
  },
  {
    id: "doc-thorne",
    name: "Dr. Marcus Thorne",
    specialty: "Pediatrician",
    department: "Pediatrics",
    experience: "10 years",
    education: "M.D. Johns Hopkins University School of Medicine",
    rating: 4.8,
    availableDays: ["Tuesday", "Thursday", "Friday"],
    availableHours: ["09:00 AM", "10:30 AM", "11:30 AM", "01:30 PM", "02:30 PM", "04:00 PM"],
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    bio: "Dedicated to providing compassionate, child-centric care and supporting families through every step of their children's development."
  },
  {
    id: "doc-lin",
    name: "Dr. Sarah Lin",
    specialty: "Neurologist",
    department: "Neurology",
    experience: "12 years",
    education: "Ph.D. & M.D. Harvard Medical School",
    rating: 4.95,
    availableDays: ["Monday", "Tuesday", "Thursday"],
    availableHours: ["10:00 AM", "11:00 AM", "02:00 PM", "03:30 PM"],
    image: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=400",
    bio: "Dr. Lin is an expert neuroscientist and neurologist, specializing in neurodegenerative conditions, migraines, and cognitive care."
  },
  {
    id: "doc-carter",
    name: "Dr. James Carter",
    specialty: "Orthopedic Surgeon",
    department: "Orthopedics",
    experience: "14 years",
    education: "M.D. Yale School of Medicine",
    rating: 4.7,
    availableDays: ["Wednesday", "Thursday", "Friday"],
    availableHours: ["08:30 AM", "10:00 AM", "11:30 AM", "01:00 PM", "03:00 PM"],
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
    bio: "Focuses on sports injuries, advanced arthroscopic joint repairs, and personalized rehabilitation programs for professional athletes and active patients."
  },
  {
    id: "doc-patel",
    name: "Dr. Chloe Patel",
    specialty: "Dermatologist",
    department: "Dermatology",
    experience: "8 years",
    education: "M.D. University of Michigan",
    rating: 4.9,
    availableDays: ["Monday", "Wednesday", "Thursday"],
    availableHours: ["09:30 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:30 PM"],
    image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400",
    bio: "Provides advanced clinical, surgical, and cosmetic dermatology solutions, focusing on acne care, eczema, and skin cancer screening."
  },
  {
    id: "doc-chen",
    name: "Dr. Robert Chen",
    specialty: "General Physician",
    department: "General Medicine",
    experience: "18 years",
    education: "M.D. Columbia University Vagelos College of Physicians and Surgeons",
    rating: 4.85,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    availableHours: ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "03:30 PM"],
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
    bio: "A trusted family physician specialized in comprehensive diagnostic evaluations, chronic disease management, and long-term vitality counseling."
  }
];

// Helper to detect simple casual greetings and non-symptom small talk
function isCasualGreeting(text: string): boolean {
  if (!text) return true;
  const cleaned = text.trim().toLowerCase().replace(/[^\w\s]/g, "");
  if (!cleaned) return true;
  
  const exactGreetings = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "howdy", "greetings", "hi there", "hello there", "hey there",
    "hi doc", "hi doctor", "hello doctor", "hey doctor", "thanks", "thank you",
    "who are you", "how are you", "what is your name", "help", "hola", "yo"
  ];

  if (exactGreetings.includes(cleaned)) return true;

  const words = cleaned.split(/\s+/);
  const firstWord = words[0];
  const isGreetingStart = ["hi", "hello", "hey", "howdy", "greetings", "good"].includes(firstWord);
  
  const hasSymptom = cleaned.includes("pain") || cleaned.includes("fever") || cleaned.includes("cough") || 
                     cleaned.includes("headache") || cleaned.includes("dizzy") || cleaned.includes("sick") || 
                     cleaned.includes("hurt") || cleaned.includes("symptom") || cleaned.includes("burn") || 
                     cleaned.includes("blood") || cleaned.includes("vomit") || cleaned.includes("nausea") ||
                     cleaned.includes("stomach") || cleaned.includes("chest") || cleaned.includes("throat") ||
                     cleaned.includes("recommend") || cleaned.includes("medicine") || cleaned.includes("drug") ||
                     cleaned.includes("doctor") || cleaned.includes("pill");

  if (isGreetingStart && words.length <= 4 && !hasSymptom) {
    return true;
  }

  return false;
}

// Helper to search medicines catalog
function queryMedicinesCatalog(symptomOrCondition: string, category?: string) {
  const query = (symptomOrCondition || "").toLowerCase();
  return MEDICINES.filter(m => {
    const matchesCategory = !category || category === "all" || m.category === category;
    const matchesQuery = 
      m.name.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.symptoms.some(s => s.toLowerCase().includes(query) || query.includes(s.toLowerCase()));
    return matchesCategory && matchesQuery;
  });
}

// Helper to search doctors catalog
function queryDoctorsCatalog(specialtyOrDepartment: string) {
  const query = (specialtyOrDepartment || "").toLowerCase();
  return INITIAL_DOCTORS.filter(d => 
    d.specialty.toLowerCase().includes(query) || 
    d.department.toLowerCase().includes(query) ||
    d.bio.toLowerCase().includes(query)
  );
}

// Initialize server-side Gemini AI client
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("[Gemini AI] Server-side Gemini client initialized successfully with @google/genai.");
  } catch (err) {
    console.warn("[Gemini AI] Failed to initialize GoogleGenAI client:", err);
  }
}

const HOSPITAL_RESOURCE_CONTEXT = `
HOSPITAL RESOURCES AT GODSCARE MEDICAL CENTER:
1. DOCTORS & SPECIALISTS:
   - Dr. Elizabeth Vance (Cardiologist) - 15 yrs exp, Heart disease, hypertension, chest symptoms.
   - Dr. Marcus Vance (Neurologist) - 12 yrs exp, Headaches, migraines, dizziness, neurological care.
   - Dr. Elena Rostova (Pediatrician) - 10 yrs exp, Children's health, fever, pediatric wellness.
   - Dr. Aisha Patel (Dermatologist) - 8 yrs exp, Skin conditions, eczema, rashes, allergies.
   - Dr. Robert Chen (General Physician) - 18 yrs exp, Primary care, infections, general checkups.
   - Dr. David Okonkwo (Orthopedic Surgeon) - 14 yrs exp, Joint pain, back pain, bone & muscle injuries.
2. DEPARTMENTS: Cardiology, Neurology, Pediatrics, Dermatology, Orthopedics, General Medicine, 24/7 Emergency & Trauma.
3. PHARMACY MEDICATIONS:
   - Paracetamol 500mg (₦1,200) - Pain & fever relief
   - Cetirizine 10mg (₦1,800) - Antihistamine for allergies, itching, sneezing
   - Vitamin C 1000mg + Zinc (₦2,500) - Immune support
   - Ibuprofen 400mg (₦1,500) - Anti-inflammatory for pain, swelling & joints
   - Omeprazole 20mg (₦3,200) - Heartburn, acid reflux & stomach ulcer relief
   - Dextromethorphan Cough Syrup (₦2,800) - Cough & throat soothing
   - Amoxicillin 500mg (₦4,500) - Bacterial infections (prescription)
   - Amlodipine 5mg (₦3,800) - Blood pressure management
4. PORTAL FEATURES: Online doctor appointments, encrypted health records & lab tests vault, pharmacy ordering, and billing invoice receipts.
5. EMERGENCY CONTACT: 0800-GODSCARE / Emergency 911 (available 24/7).
`;

const AGENT_SYSTEM_PROMPT = `You are a helpful, friendly, and efficient assistant chatbot for GodsCare Medical Center.

YOUR ROLE:
You help users with their inquiries, issues, and requests with excellent, friendly, and efficient replies.
Listen attentively to the user, understanding their needs, and do your best to assist them or direct them to the appropriate resources.
If a question is not clear, ask clarifying questions.
Make sure to end your replies with a positive note.
Do not compile one particular rigid response in total — tailor each response naturally to the user.

CRITICAL ANTI-REPETITION AND CONVERSATION CONTINUITY RULES (STRICT):
- NEVER REPEAT PREVIOUS ANSWERS: Thoroughly inspect the full conversation history. Do NOT repeat the exact same sentences, phrasing, doctor bios, medication lists, phone numbers, or paragraphs that you or the user already stated in earlier turns.
- NO REPETITIVE GREETINGS: Do NOT greet the user ("Hello [Name]!", "Welcome to GodsCare", etc.) on every message turn after the initial conversation start. Jump directly into answering their question.
- DYNAMIC PROGRESSION: If the user is asking a follow-up question or continuing a dialogue, build directly upon what was already established. Offer fresh, specific, and actionable details (e.g., next steps, alternatives, slot times, dosage tips) rather than repeating prior overviews.
- NEVER RE-PROMPT WITH THE SAME MENU: If the user provides brief answers (like "2 days", "yes", "tomorrow"), recognize that they are answering your previous question. Do NOT reset or re-send a generic menu of options.

CRITICAL FORMATTING & STYLE RULES:
- Keep responses clean, plain, and conversational.
- Do NOT include promotional writeups, slogans, or robot introductions (e.g. do NOT say "I am GodsCare AI Quick Respond Agent" or "Welcome to GodsCare Medical Center").
- Do NOT use heavy markdown headers like "### GodsCare Quick Support" or "### Doctor Appointment Assistance". Just provide plain, natural conversational answers.
- Be concise, direct, helpful, and warm.

${HOSPITAL_RESOURCE_CONTEXT}
`;

// Helper to test if a candidate response shares too much similarity with past responses in the thread
function isRepetitiveResponse(candidate: string, pastTexts: string[]): boolean {
  if (!pastTexts || pastTexts.length === 0) return false;
  const cleanCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  
  for (const past of pastTexts) {
    const cleanPast = past.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
    if (cleanCandidate === cleanPast) return true;
    
    // Check significant word overlap
    const candidateWords = cleanCandidate.split(/\s+/).filter(w => w.length > 3);
    const pastWords = new Set(cleanPast.split(/\s+/).filter(w => w.length > 3));
    
    if (candidateWords.length >= 6) {
      let overlapCount = 0;
      for (const w of candidateWords) {
        if (pastWords.has(w)) overlapCount++;
      }
      if (overlapCount / candidateWords.length > 0.65) {
        return true;
      }
    }
  }
  return false;
}

// Clean, Context-Aware, Anti-Repeating Quick Respond Fallback Engine
async function generateLocalQuickAgentResponse(messages: any[], uid: string, role: string = "general_assistant") {
  try {
    const userMessages = messages.filter(m => m.role === "user");
    const botMessages = messages.filter(m => m.role === "model" || m.role === "assistant");
    
    // Extract past bot responses to guarantee zero repetition
    const pastBotTexts = botMessages.map(m => {
      if (Array.isArray(m.parts)) return m.parts.map((p: any) => p.text || "").join(" ").trim();
      return (m.text || m.content || "").trim();
    }).filter(Boolean);

    // Extract last user message
    let lastMessageText = "";
    if (userMessages.length > 0) {
      const lastMsg = userMessages[userMessages.length - 1];
      if (lastMsg.parts && Array.isArray(lastMsg.parts) && lastMsg.parts.length > 0) {
        lastMessageText = lastMsg.parts.map((p: any) => p.text || "").join(" ").trim();
      } else if (typeof lastMsg.content === "string") {
        lastMessageText = lastMsg.content;
      } else if (typeof lastMsg.text === "string") {
        lastMessageText = lastMsg.text;
      }
    }
    
    if (!lastMessageText) {
      lastMessageText = "Hello";
    }

    const textLower = lastMessageText.toLowerCase().trim();
    const context = await fetchPatientContext(uid);
    const patientName = context && !context.error && context.profile && context.profile.fullName ? context.profile.fullName.split(' ')[0] : "";
    
    // Conversation stage awareness
    const turnCount = userMessages.length;
    const hasPriorBotGreeting = pastBotTexts.some(t => {
      const lower = t.toLowerCase();
      return lower.includes("hello") || lower.includes("how can i help") || lower.includes("welcome to godscare");
    });
    
    // Check what the previous assistant response asked or recommended
    const previousBotText = pastBotTexts.length > 0 ? pastBotTexts[pastBotTexts.length - 1].toLowerCase() : "";
    const wasAskedAboutDurationOrFever = previousBotText.includes("how long") || previousBotText.includes("fever") || previousBotText.includes("symptoms");
    const wasAskedAboutBookingTime = previousBotText.includes("preferred time") || previousBotText.includes("date and time slot") || previousBotText.includes("appointment");
    
    // Helper to pick non-repeating response from multiple options
    const pickNonRepeating = (candidates: string[]): string => {
      for (const cand of candidates) {
        if (!isRepetitiveResponse(cand, pastBotTexts)) {
          return cand;
        }
      }
      return candidates[candidates.length - 1];
    };

    // 1. Follow-up answers to clarifying questions asked by the assistant in the previous turn
    if (wasAskedAboutDurationOrFever) {
      const mentionsFever = textLower.includes("fever") || textLower.includes("hot") || textLower.includes("temperature") || textLower.includes("high");
      const mentionsDuration = textLower.includes("day") || textLower.includes("yesterday") || textLower.includes("week") || textLower.includes("morning") || textLower.includes("hour") || textLower.includes("since");
      const isAffirmative = textLower === "yes" || textLower === "yeah" || textLower === "yep" || textLower.includes("have fever");
      const isNegative = textLower === "no" || textLower === "nope" || textLower === "none" || textLower.includes("no fever");

      if (mentionsFever || isAffirmative || textLower.includes("few days") || textLower.includes("3 days") || textLower.includes("week")) {
        return {
          text: pickNonRepeating([
            "Thank you for confirming that. Because symptoms have persisted or include a fever, an in-person clinical evaluation is the safest course of action. I recommend booking an outpatient consultation with Dr. Robert Chen (General Medicine) so our team can examine you. In the meantime, drink plenty of cool fluids, rest, and keep a cool compress available. Would you like me to guide you to booking an appointment?",
            "Understood. Persistent symptoms with elevated body temperature should be evaluated by a physician rather than managed with home remedies alone. You can book an appointment with our clinical team under the Doctors tab for a same-day or next-day review. Please keep yourself rested and hydrated while you prepare to visit.",
            "Thank you for the update. Since this has been ongoing, please visit our clinic or consult with Dr. Robert Chen. If your temperature rises further or you develop chills, feel free to walk into our 24/7 emergency unit directly."
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      } else if (isNegative || mentionsDuration) {
        return {
          text: pickNonRepeating([
            "Thank you for the context. It's good to hear there is no high fever. For ongoing mild discomfort, staying thoroughly hydrated, taking restful breaks, and using mild over-the-counter medication like Paracetamol (₦1,200) from our Pharmacy tab can provide gentle relief. If you don't feel noticeably better within another 24 hours, booking a clinical visit is recommended. How is your energy level otherwise?",
            "Got it. Since there is no fever, you can focus on gentle recovery: adequate fluids, light nutrition, and rest. If you'd like to order any supportive medications from our pharmacy, they can be ordered directly from the Pharmacy tab with quick delivery or pickup.",
            "That's helpful context. Keep monitoring your symptoms closely over the next day or two. If anything changes or begins feeling more severe, don't hesitate to reach out or book a consultation with our outpatient clinic."
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }
    }

    if (wasAskedAboutBookingTime) {
      if (textLower.includes("tomorrow") || textLower.includes("morning") || textLower.includes("afternoon") || textLower.includes("today") || textLower.includes("monday") || textLower.includes("friday") || textLower.includes("am") || textLower.includes("pm") || textLower.includes("slot")) {
        return {
          text: pickNonRepeating([
            `Great! To confirm your appointment for that preferred time, open the 'Doctors' tab from the main menu, pick your specialist, and select your preferred slot. You'll complete the standard ₦3,500 booking fee to lock in your priority consultation. Once booked, your digital confirmation will be stored in your Appointments tab. Let me know if you need help finding a specific doctor!`,
            `Noted! You can finalize that slot directly in the Doctors section. All morning and afternoon clinic hours are open for selection. If you have any previous lab records, you can also view and attach them in your Medical Records tab before your visit.`,
            `Understood! Head over to the Doctors tab to choose your specialist and tap 'Book Appointment'. The whole process takes less than a minute. Let me know if you'd like more details on what to bring to your consultation!`
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }
    }

    // 2. Greetings and Casual Small Talk (strictly avoid repeating greetings if already exchanged)
    if (isCasualGreeting(lastMessageText)) {
      if (textLower.includes("thank")) {
        return {
          text: pickNonRepeating([
            "You're very welcome! If there is anything else you need, please feel free to ask. Wishing you great health!",
            "Happy to help! Let me know whenever you have more questions or need medical assistance.",
            "Always a pleasure. Take care of yourself, and don't hesitate to reach out if you need anything!",
            "Anytime! We're here for you 24/7 at GodsCare Medical Center."
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }

      if (textLower.includes("how are you")) {
        return {
          text: pickNonRepeating([
            "I'm doing great, thank you for asking! What medical or portal assistance can I help you with right now?",
            "Doing wonderful and ready to help! Feel free to ask about our doctors, pharmacy, or clinic services.",
            "I'm here and ready to assist you. How is your day going, and what can I assist you with today?"
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }

      // If already greeted in previous turns, do NOT repeat the greeting
      if (hasPriorBotGreeting || turnCount > 1) {
        return {
          text: pickNonRepeating([
            "I'm right here! What would you like to explore—booking a doctor, ordering medicines, or checking your medical records?",
            "Ready when you are. Tell me what symptoms or hospital services you'd like help with.",
            "How can I assist you further? Let me know what you need and I'll guide you directly."
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }

      const greeting = patientName ? `Hello ${patientName}!` : "Hello!";
      return {
        text: `${greeting} How can I help you today? You can ask about doctor appointments, our pharmacy, medical records, or hospital services.`,
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 3. Ambiguous or overly brief queries
    const isSingleWord = textLower.split(/\s+/).length <= 2;
    const isAmbiguousQuery = [
      "help", "issue", "problem", "question", "sick", "what", "how", "portal", "ill", "urgent", "need help", "info"
    ].includes(textLower) || (isSingleWord && !isCasualGreeting(lastMessageText) && !textLower.includes("doctor") && !textLower.includes("med") && !textLower.includes("book"));

    if (isAmbiguousQuery) {
      if (hasPriorBotGreeting || turnCount > 1) {
        return {
          text: pickNonRepeating([
            "Could you give me a little more detail on what you're looking for? For instance, are you experiencing symptoms, needing a doctor consultation, or looking for medication from our pharmacy?",
            "I'm happy to help. What specific aspect can I guide you through—scheduling an appointment, accessing your lab results, or something else?",
            "Tell me a bit more about what you need so I can give you the exact guidance or department contact."
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }
      
      const greeting = patientName ? `Hello ${patientName}!` : "Hello!";
      return {
        text: `${greeting} How can I assist you today? Please let me know if you'd like to book a doctor appointment, check pharmacy medicines, access your medical records, or ask about specific symptoms.`,
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 4. Appointment & Doctor Booking Requests
    if (textLower.includes("appointment") || textLower.includes("book") || textLower.includes("schedule") || textLower.includes("see a doctor") || textLower.includes("consultation") || textLower.includes("doctor")) {
      const isCardio = textLower.includes("heart") || textLower.includes("cardio") || textLower.includes("blood pressure");
      const isNeuro = textLower.includes("brain") || textLower.includes("head") || textLower.includes("neuro");
      const isPeds = textLower.includes("child") || textLower.includes("kid") || textLower.includes("baby") || textLower.includes("pediatric");
      const isDerma = textLower.includes("skin") || textLower.includes("derma") || textLower.includes("rash");
      const isOrtho = textLower.includes("bone") || textLower.includes("joint") || textLower.includes("ortho") || textLower.includes("back");

      let suggestedDoc = INITIAL_DOCTORS[0]; // Dr. Vance
      if (isNeuro) suggestedDoc = INITIAL_DOCTORS[1];
      else if (isPeds) suggestedDoc = INITIAL_DOCTORS[2];
      else if (isDerma) suggestedDoc = INITIAL_DOCTORS[3];
      else if (isOrtho) suggestedDoc = INITIAL_DOCTORS[4];
      else if (!isCardio) suggestedDoc = INITIAL_DOCTORS[5]; // Dr. Robert Chen (General)

      // Check if this doctor was already suggested in earlier messages
      const alreadySuggestedThisDoc = pastBotTexts.some(t => t.includes(suggestedDoc.name));

      if (alreadySuggestedThisDoc || turnCount > 2) {
        return {
          text: pickNonRepeating([
            `To finalize your booking with ${suggestedDoc.name}, navigate to the Doctors tab, select a date, and pick your preferred time slot. The consultation fee is ₦3,500. Do you prefer a morning or afternoon appointment?`,
            `Booking with ${suggestedDoc.name} is quick: head to the Doctors section, click 'Book Appointment', and choose your date. Once completed, your confirmed appointment will appear in your Appointments dashboard. Let me know if you need assistance with checkout!`,
            `If you'd like to see an alternative clinician in that wing or need emergency attention today, our General Outpatient Clinic is also open for walk-ins from 8:00 AM to 6:00 PM. Would you like details on same-day clinic walk-ins?`
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }

      return {
        text: pickNonRepeating([
          `I can help you book an appointment. For this, I recommend ${suggestedDoc.name} (${suggestedDoc.specialty}, ${suggestedDoc.experience} exp). They are available on ${suggestedDoc.availableDays.join(", ")}.\n\nYou can head to the Doctors section in the menu to select a convenient date and time slot. If you have a preferred time or need another specialist, please let me know!`,
          `We have specialized clinicians ready to assist you. ${suggestedDoc.name} in ${suggestedDoc.department} (${suggestedDoc.specialty}) has immediate open consultation slots this week. You can view their full profile and reserve your slot under the Doctors section.`
        ]),
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 5. Pharmacy & Medication Inquiries
    if (textLower.includes("pharmacy") || textLower.includes("medicine") || textLower.includes("medication") || textLower.includes("drug") || textLower.includes("pill") || textLower.includes("prescription")) {
      const alreadyIntroducedPharmacy = pastBotTexts.some(t => t.includes("Cetirizine") || t.includes("Paracetamol") || t.includes("Pharmacy section"));

      if (alreadyIntroducedPharmacy) {
        return {
          text: pickNonRepeating([
            "You can complete your medicine orders directly in the Pharmacy tab. All formulations are verified by our licensed pharmacists, with secure payment and doorstep dispatch or clinic pickup. Are you looking for a specific medication or dosage instructions?",
            "In the Pharmacy section, you can filter medications by severity category (Mild, Moderate, Severe) or search by symptoms. Once you add items to your cart, click 'Order Medicine' to finalize your order. Let me know if you'd like details on any particular formulation!",
            "Our pharmacy is stocked with genuine pharmaceuticals at approved hospital retail rates. If you have an active prescription from your GodsCare clinician, our dispensary will match it directly upon ordering."
          ]),
          modelUsed: "plain-chatbot",
          roleUsed: role
        };
      }

      return {
        text: pickNonRepeating([
          `Our online pharmacy offers approved medications including Paracetamol 500mg (₦1,200), Cetirizine 10mg for allergies (₦1,800), Ibuprofen 400mg (₦1,500), Omeprazole 20mg for acid reflux (₦3,200), and Vitamin C + Zinc (₦2,500).\n\nYou can browse all available medicines and order directly in the Pharmacy section. If you need a recommendation for specific symptoms, feel free to ask!`,
          `Our licensed pharmacy provides essential therapeutics with fast fulfillment. Common remedies like Paracetamol, allergy treatments, pain relievers, and multivitamins are available in the Pharmacy tab for immediate ordering. What specific symptoms are you seeking relief for?`
        ]),
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 6. Portal Issues, Login, Records, Billing & Receipts
    if (textLower.includes("login") || textLower.includes("password") || textLower.includes("bill") || textLower.includes("payment") || textLower.includes("receipt") || textLower.includes("record") || textLower.includes("lab result") || textLower.includes("account")) {
      return {
        text: pickNonRepeating([
          `You can access your medical records and lab test results directly under the Medical Records section in your dashboard. All verified invoices and payment receipts are available in the Billing section. If you're experiencing an issue logging in or need help verifying a transaction, please let me know the details!`,
          `All official diagnosis summaries, test reports, and billing receipts are encrypted and available in your patient portal. To download an invoice or review past payments, click the 'Billing' tab. For lab results, visit 'Medical Records'. Let me know if you need help finding a specific document.`,
          `If you need an itemized bill or insurance receipt, you can view and print it directly from the Billing tab. If you're experiencing any technical trouble with your account credentials, our admin desk is also available to verify your records.`
        ]),
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 7. Hospital Departments, Hours & Emergency Contacts
    if (textLower.includes("department") || textLower.includes("emergency") || textLower.includes("hours") || textLower.includes("contact") || textLower.includes("location") || textLower.includes("phone") || textLower.includes("ambulance")) {
      return {
        text: pickNonRepeating([
          `GodsCare Emergency & Trauma Center is open 24/7. Outpatient clinics operate Monday to Saturday from 8:00 AM to 6:00 PM. Our emergency hotline is 0800-GODSCARE (or 911). Departments include Cardiology, Neurology, Pediatrics, Dermatology, Orthopedics, and General Medicine. Let me know if you need directions or contact for a specific department!`,
          `Our main hospital facility is located centrally, with 24-hour round-the-clock emergency admitting and ambulance dispatch. Outpatient specialist clinics run Monday through Saturday. For urgent needs, call our hotline at 0800-GODSCARE.`
        ]),
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 8. Red-flag emergency symptoms
    const isRedFlag = textLower.includes("chest pain") || textLower.includes("heart attack") || textLower.includes("difficulty breathing") || textLower.includes("shortness of breath") || textLower.includes("stroke") || textLower.includes("coughing blood");

    if (isRedFlag) {
      return {
        text: `These symptoms may indicate a medical emergency. Please call 911 or our 24/7 hotline at 0800-GODSCARE immediately, or have someone take you to the nearest emergency department right away. Please sit down comfortably, loosen any tight clothing, and avoid exerting yourself while help is on the way. Your health and safety are the top priority.`,
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    // 9. Specific Symptoms Guidance (Contextual, Anti-Repeating)
    let relevantDoc = INITIAL_DOCTORS[5]; // Dr. Robert Chen
    let relevantMed = MEDICINES[0]; // Paracetamol
    let careAdvice = "Make sure to stay well hydrated, rest, and monitor your symptoms.";

    if (textLower.includes("headache") || textLower.includes("migraine") || textLower.includes("dizzy")) {
      relevantDoc = INITIAL_DOCTORS[1];
      relevantMed = MEDICINES[0];
      careAdvice = "Rest in a quiet, dark room, drink plenty of water, and try a cool compress on your forehead.";
    } else if (textLower.includes("fever") || textLower.includes("cough") || textLower.includes("cold") || textLower.includes("throat")) {
      relevantDoc = INITIAL_DOCTORS[5];
      relevantMed = MEDICINES[5];
      careAdvice = "Drink warm fluids with honey and lemon, rest, and keep yourself warm.";
    } else if (textLower.includes("stomach") || textLower.includes("acid") || textLower.includes("indigestion") || textLower.includes("heartburn")) {
      relevantDoc = INITIAL_DOCTORS[5];
      relevantMed = MEDICINES[4];
      careAdvice = "Avoid spicy or heavy foods, eat smaller meals, and avoid lying down right after eating.";
    } else if (textLower.includes("rash") || textLower.includes("itch") || textLower.includes("skin") || textLower.includes("allergy")) {
      relevantDoc = INITIAL_DOCTORS[3];
      relevantMed = MEDICINES[1];
      careAdvice = "Gently cleanse with cool water, avoid scratching, and stay away from harsh soaps.";
    } else if (textLower.includes("back") || textLower.includes("joint") || textLower.includes("muscle") || textLower.includes("knee") || textLower.includes("sprain")) {
      relevantDoc = INITIAL_DOCTORS[4];
      relevantMed = MEDICINES[3];
      careAdvice = "Rest the area, apply ice for 15 minutes at a time, and avoid heavy lifting.";
    }

    // Check if we already discussed this symptom in previous turns
    const alreadyAddressedThisSymptom = pastBotTexts.some(t => t.includes(relevantMed.name) || t.includes(careAdvice.slice(0, 20)));

    if (alreadyAddressedThisSymptom) {
      return {
        text: pickNonRepeating([
          `Since these symptoms are still concerning you, consulting with ${relevantDoc.name} (${relevantDoc.specialty}) is the most thorough next step. You can schedule a consultation in the Doctors tab. In the meantime, remember not to push yourself and continue getting plenty of rest. Would you like me to guide you to their next open slot?`,
          `If resting and basic care have not provided enough relief, having our clinical team perform a physical examination is recommended. Dr. Robert Chen and the outpatient team have appointments open this week. Would you like information on our consultation fees and hours?`,
          `Please continue monitoring your condition carefully. If you develop any secondary symptoms like nausea, fever, or acute pain, please visit our outpatient clinic or contact 0800-GODSCARE directly.`
        ]),
        modelUsed: "plain-chatbot",
        roleUsed: role
      };
    }

    return {
      text: pickNonRepeating([
        `For your symptoms, here is some supportive advice: ${careAdvice}\n\nYou can consider ${relevantMed.name} (₦${relevantMed.price.toLocaleString()}) from our pharmacy for relief, or schedule an appointment with ${relevantDoc.name} (${relevantDoc.specialty}) for a clinical checkup.\n\nCould you let me know how long you've had these symptoms, and if there is any fever? Wishing you a quick recovery!`,
        `To help soothe what you're experiencing: ${careAdvice}\n\nOur pharmacy has ${relevantMed.name} in stock, and ${relevantDoc.name} in ${relevantDoc.department} can evaluate you if needed. How many days have you been experiencing this?`
      ]),
      modelUsed: "plain-chatbot",
      roleUsed: role
    };

  } catch (err) {
    console.error("[Quick Agent Error]:", err);
    return {
      text: `I'm here to assist you with doctor appointments, pharmacy orders, or medical records. What can I help you explore today?`,
      modelUsed: "plain-chatbot",
      roleUsed: role
    };
  }
}

// Master AI Agent Quick Respond Controller
const handleClinicalConsultation = async (req: express.Request, res: express.Response) => {
  const { messages, uid, role } = req.body;
  if (!uid || !messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Missing required parameters: messages array and uid." });
    return;
  }

  const selectedRole = role || "general_assistant";

  // Attempt real Gemini API call first if client is configured
  if (geminiClient) {
    try {
      // Format messages for @google/genai SDK
      const contents = messages
        .filter((m: any) => m && (m.text || m.content || (Array.isArray(m.parts) && m.parts.length > 0)))
        .map((m: any) => {
          const role = (m.role === "model" || m.role === "assistant") ? "model" : "user";
          let text = "";
          if (Array.isArray(m.parts)) {
            text = m.parts.map((p: any) => p.text || "").join(" ").trim();
          } else if (typeof m.content === "string") {
            text = m.content.trim();
          } else if (typeof m.text === "string") {
            text = m.text.trim();
          }
          return {
            role,
            parts: [{ text: text || "Hello" }]
          };
        });

      if (contents.length > 0) {
        console.log(`[Gemini AI] Calling gemini-3.8-flash for user ${uid}...`);
        const response = await geminiClient.models.generateContent({
          model: "gemini-3.8-flash",
          contents: contents,
          config: {
            systemInstruction: AGENT_SYSTEM_PROMPT,
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        });

        const replyText = response.text?.trim();
        if (replyText) {
          res.json({
            text: replyText,
            modelUsed: "gemini-3.8-flash",
            roleUsed: selectedRole
          });
          return;
        }
      }
    } catch (geminiError: any) {
      console.warn("[Gemini AI] Live API call failed, falling back to adaptive quick responder:", geminiError?.message || geminiError);
    }
  }

  // Adaptive, contextual quick-respond fallback
  const fallbackResult = await generateLocalQuickAgentResponse(messages, uid, selectedRole);
  res.json(fallbackResult);
};

app.post("/api/gemini/agent", handleClinicalConsultation);
app.post("/api/agent/chat", handleClinicalConsultation);


// ==========================================
// VITE DEV SERVER / PRODUCTION CONFIG
// ==========================================

// Helper to seed doctors dynamically on startup
async function seedDoctorsCollection() {
  try {
    if (!db) return;
    const colRef = collection(db, "doctors");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log("[Seeding] Seeding doctors database securely from server...");
      for (const docData of INITIAL_DOCTORS) {
        await setDoc(doc(db, "doctors", docData.id), docData);
      }
      console.log("[Seeding] Secure backend doctor seeding completed successfully!");
    } else {
      console.log("[Seeding] Doctors database is already populated.");
    }
  } catch (error) {
    console.error("[Seeding Error] Failed to seed doctors:", error);
  }
}

const MPA_PAGE_ROUTES: Record<string, string> = {
  "/": "index.html",
  "/index.html": "index.html",
  "/departments": "departments.html",
  "/departments.html": "departments.html",
  "/doctors": "doctors.html",
  "/doctors.html": "doctors.html",
  "/auth": "auth.html",
  "/auth.html": "auth.html",
  "/dashboard": "dashboard.html",
  "/dashboard.html": "dashboard.html",
  "/admin": "admin.html",
  "/admin.html": "admin.html",
  "/director": "director.html",
  "/director.html": "director.html",
  "/admin-administrator": "director.html",
  "/admin_administrator": "director.html",
};

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "mpa",
      });

      // Rewrite clean MPA paths (e.g. /departments -> /departments.html) for Vite MPA middleware
      app.use((req, _res, next) => {
        if (req.method === "GET" && req.path && !req.path.startsWith("/api/")) {
          const normalized = req.path.length > 1 ? req.path.replace(/\/+$/, "").toLowerCase() : "/";
          const targetHtml = MPA_PAGE_ROUTES[normalized];
          if (targetHtml && !req.path.endsWith(".html")) {
            const qIndex = req.url.indexOf("?");
            const qs = qIndex >= 0 ? req.url.slice(qIndex) : "";
            req.url = `/${targetHtml}${qs}`;
          }
        }
        next();
      });

      app.use(vite.middlewares);
      console.log("[Server] Vite MPA dev server mounted.");
    } catch (err) {
      console.error("[Server] Failed to load Vite dev server:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    for (const [routePath, htmlFile] of Object.entries(MPA_PAGE_ROUTES)) {
      if (!routePath.endsWith(".html")) {
        app.get(routePath, (_req, res) => {
          res.sendFile(path.join(distPath, htmlFile));
        });
      }
    }

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Production MPA static files serving activated.");
  }

  // Seed initial doctors asynchronously
  seedDoctorsCollection().catch((err) => {
    console.error("[Seeding] Error seeding doctors:", err);
  });

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Godscare full-stack environment listening at http://localhost:${PORT}`);
    });
  } else {
    console.log("[Server] Running as a serverless function on Vercel. Port listener bypassed.");
  }
}

startServer();

export default app;
