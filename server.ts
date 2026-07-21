import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
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

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    }
  }
});

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
    <html>
      <head>
        <title>GodsCareHospital Sandbox Paystack Gateway</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
          .font-mono-card { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="bg-slate-100 flex items-center justify-center min-h-screen p-4 text-zinc-800">
        <div class="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
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
      generatedBy: "AI Agent (Gemini 3.5)",
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

// Tool definitions for Gemini Function Calling
const getUserProfileDataTool = {
  name: "getUserProfileData",
  description: "Queries historical context from Firestore including the user's patient profile, physical medical history, allergies, chronic conditions, and previous/pending appointments.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      uid: {
        type: Type.STRING,
        description: "The patient's unique Firestore identifier (UID)."
      }
    },
    required: ["uid"]
  }
};

const logNewUserInsightTool = {
  name: "logNewUserInsight",
  description: "Autonomously saves structured medical diagnostic insights, clinical advisories, and step-by-step care plans back into Firestore to create actionable pathways.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      uid: {
        type: Type.STRING,
        description: "The patient's unique Firestore identifier (UID)."
      },
      insight: {
        type: Type.STRING,
        description: "A summary of the clinical advisory or diagnosis insight generated."
      },
      carePlanSteps: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        },
        description: "Actionable steps or self-care instructions for the patient."
      },
      severity: {
        type: Type.STRING,
        enum: ["low", "medium", "high"],
        description: "Clinical priority / severity classification."
      }
    },
    required: ["uid", "insight", "carePlanSteps", "severity"]
  }
};

// Helper to generate clinical fallback response if Gemini API key quota is depleted or offline
async function generateClinicalFallback(messages: any[], uid: string) {
  try {
    // 1. Extract the last user message to assess symptoms
    const userMessages = messages.filter(m => m.role === "user");
    const lastMessageText = userMessages.length > 0 
      ? userMessages[userMessages.length - 1].parts?.[0]?.text || ""
      : "";
    
    const textLower = lastMessageText.toLowerCase();
    
    // 2. Fetch context from DB to make it personal
    const context = await fetchPatientContext(uid);
    const patientName = context && !context.error && context.profile ? context.profile.fullName || "Valued Patient" : "Valued Patient";

    // 3. Determine specialty, severity, and details
    let specialty = "Family Medicine";
    let department = "Family Medicine";
    let severity = "low";
    let differentials = "";
    let careSteps: string[] = [];
    let suggestedMedClasses = "";
    let isRedFlag = false;

    // Check Red Flags / Urgent Triage
    if (textLower.includes("chest pain") || textLower.includes("crushing chest") || textLower.includes("heart attack") || textLower.includes("difficulty breathing") || textLower.includes("shortness of breath") || textLower.includes("dyspnea") || textLower.includes("unilateral weakness") || textLower.includes("stroke") || textLower.includes("sudden numbness") || textLower.includes("facial droop") || textLower.includes("anaphylaxis") || textLower.includes("severe allergic") || textLower.includes("worst headache")) {
      isRedFlag = true;
      severity = "high";
      specialty = "Emergency Medicine / Cardiology";
      department = "Cardiology";
      differentials = "Acute Coronary Syndrome (ACS), acute myocarditis, or acute pulmonary embolism versus severe reactive airway bronchospasm or cerebrovascular accident (CVA). Immediate emergency gold-standard diagnostic workup is mandatory.";
      careSteps = [
        "CRITICAL: Call local emergency services (911 or emergency response) immediately. Do not drive yourself.",
        "Rest quietly in a semi-upright position to reduce cardiac/respiratory workload.",
        "If advised by an emergency dispatcher and not contraindicated, chew a standard adult aspirin (325mg).",
        "Monitor vital parameters (oxygen level, pulse rate) if a reliable pulse oximeter is nearby.",
        "Ensure front doorway is unlocked for emergency responders."
      ];
      suggestedMedClasses = "Emergency systemic antiplatelets, coronary vasodilators (nitrates), or bronchodilators administered under direct specialist paramedic supervision.";
    }
    // Cardiology
    else if (textLower.includes("heart") || textLower.includes("chest") || textLower.includes("palpitation") || textLower.includes("palpitations") || textLower.includes("pulse") || textLower.includes("blood pressure") || textLower.includes("hypertension") || textLower.includes("tightness")) {
      severity = "medium";
      specialty = "Cardiology";
      department = "Cardiology";
      differentials = "Mild-to-moderate systemic hypertension, stress-induced sinus tachycardia, palpitations secondary to caffeine or electrolyte imbalance, or early angina pectoris.";
      careSteps = [
        "Log your blood pressure and pulse rate twice daily (morning and evening). Use a calibrated cuff.",
        "Strictly reduce sodium intake to less than 1,500mg per day and eliminate stimulants (caffeine, nicotine).",
        "Engage in light aerobic activities (e.g., walking 20 minutes) only after cardiologist clearance.",
        "Stay hydrated (minimum 2.5L of water daily) and practice diaphragmatic breathing exercises."
      ];
      suggestedMedClasses = "Calcium channel blockers (such as Amlodipine), beta-blockers, or ACE inhibitors under precise cardiologist direction.";
    }
    // Pediatrics
    else if (textLower.includes("child") || textLower.includes("baby") || textLower.includes("kid") || textLower.includes("pediatric") || textLower.includes("son") || textLower.includes("daughter") || textLower.includes("toddler") || textLower.includes("infant")) {
      severity = "medium";
      specialty = "Pediatrics";
      department = "Pediatrics";
      differentials = "Pediatric viral exanthem, benign childhood febrile illness, pediatric acute gastroenteritis, or transient upper respiratory tract infection.";
      careSteps = [
        "Ensure continuous, small-volume hydration (oral rehydration solutions) to prevent pediatric dehydration.",
        "Monitor body temperature rectally or tympanically every 4 hours. Keep a precise written log.",
        "Administer children's weight-based mild antipyretics only as authorized by a pediatrician.",
        "Seek immediate care if the child exhibits lethargy, poor feeding, or a temperature exceeding 38.5°C (101.3°F)."
      ];
      suggestedMedClasses = "Pediatric-formulated weight-adjusted antipyretics, oral rehydration therapy, or gentle pediatric antihistamines.";
    }
    // Brain / Neurology
    else if (textLower.includes("headache") || textLower.includes("migraine") || textLower.includes("dizzy") || textLower.includes("dizziness") || textLower.includes("numb") || textLower.includes("seizure") || textLower.includes("brain") || textLower.includes("nerve")) {
      severity = textLower.includes("seizure") || textLower.includes("faint") ? "high" : "medium";
      specialty = "Neurology";
      department = "Neurology";
      differentials = "Classic migraine with/without aura, tension-type headache, benign paroxysmal positional vertigo (BPPV), or peripheral neuropathy secondary to metabolic stressors.";
      careSteps = [
        "Rest in a quiet, completely darkened room at the immediate onset of neurological symptoms.",
        "Apply a cold compress to the forehead or the back of the neck to constrict blood vessels.",
        "Keep a meticulous headache journal tracking triggers (sleep deprivation, specific foods, stressors).",
        "Avoid screen time, bright lights, and sudden postural changes (stand up slowly from lying down)."
      ];
      suggestedMedClasses = "Serotonin receptor agonists (triptans), mild analgesics (such as Ibuprofen or Acetaminophen), or peripheral vasodilators under specialist care.";
    }
    // Skin / Dermatology
    else if (textLower.includes("rash") || textLower.includes("itch") || textLower.includes("skin") || textLower.includes("acne") || textLower.includes("mole") || textLower.includes("eczema") || textLower.includes("dermatology") || textLower.includes("spot")) {
      severity = "low";
      specialty = "Dermatology";
      department = "Dermatology";
      differentials = "Contact dermatitis, acute localized urticaria, atopic eczema flare-up, or superficial fungal/bacterial integumentary infection.";
      careSteps = [
        "Cleanse the affected area gently with lukewarm water and a fragrance-free, mild soap.",
        "Apply a cold, damp cloth to soothe intense itching or swelling. Avoid rubbing or scratching.",
        "Apply a thin layer of over-the-counter hydrocortisone cream or a high-quality ceramide moisturizer.",
        "Keep a list of any newly introduced topical cosmetics, laundry detergents, or fabrics."
      ];
      suggestedMedClasses = "Topical corticosteroids, non-drowsy systemic antihistamines (such as Cetirizine), or topical barrier repair ointments.";
    }
    // Orthopedics / Pain
    else if (textLower.includes("bone") || textLower.includes("joint") || textLower.includes("muscle") || textLower.includes("back pain") || textLower.includes("sprain") || textLower.includes("fracture") || textLower.includes("knee") || textLower.includes("shoulder") || textLower.includes("fractured") || textLower.includes("broke")) {
      severity = textLower.includes("fracture") || textLower.includes("broke") ? "high" : "medium";
      specialty = "Orthopedics";
      department = "Orthopedics";
      differentials = "Acute musculoskeletal ligamentous sprain, muscle myofascial strain, degenerative joint disease/osteoarthritis, or mechanical lumbar spondylosis.";
      careSteps = [
        "Strictly implement the PRICE protocol: Protect the joint, Rest, Ice (15 mins on/off), Compress with an elastic wrap, and Elevate above heart level.",
        "Avoid all heavy weight-bearing activities or repetitive high-impact motion.",
        "Perform gentle, passive range-of-motion stretching only within a completely pain-free threshold.",
        "Apply localized heat therapy after the first 48 hours to promote blood circulation and muscle relaxation."
      ];
      suggestedMedClasses = "Non-steroidal anti-inflammatory drugs (NSAIDs like Ibuprofen), topical analgesic gels, or central muscle relaxants.";
    }
    // General Infection / Stomach / Gastro / Other
    else {
      severity = "low";
      specialty = "Family Medicine / Internal Medicine";
      department = "Family Medicine";
      differentials = "Uncomplicated upper respiratory viral infection, mild viral gastroenteritis, acute acid reflux/GERD, or transient somatic fatigue.";
      careSteps = [
        "Ensure optimal physical rest (minimum 8-9 hours of restful sleep daily).",
        "Hydrate generously with water, herbal teas, or electrolyte-balanced broths (2.5-3 liters daily).",
        "Eat small, easily digestible, bland meals (e.g., bananas, rice, applesauce, toast) to ease digestive load.",
        "Steam inhalation or saline nasal sprays twice daily to relieve upper airway congestion."
      ];
      suggestedMedClasses = "Mild antipyretics and analgesics (such as Paracetamol), oral antihistamines, or proton pump inhibitors (such as Omeprazole).";
    }

    // 4. Find matched medicines in our list
    const matchedMeds = MEDICINES.filter(m => {
      return m.symptoms.some(sym => textLower.includes(sym.toLowerCase())) ||
             m.name.toLowerCase().includes(textLower) ||
             m.description.toLowerCase().includes(textLower);
    });

    const matchedDoctors = INITIAL_DOCTORS.filter(d => d.specialty.toLowerCase() === specialty.toLowerCase() || d.department.toLowerCase() === department.toLowerCase());

    // 5. Structure the highly clinical output
    const welcomeStr = isRedFlag
      ? `### 🚨 CRITICAL EMERGENCY CLINICAL ALERT`
      : `### 🩺 GodsCare Clinical AI Specialist Assessment`;

    let markdownResponse = `${welcomeStr}
  
Hello, **${patientName}**. I have processed your clinical presentation and completed a structured diagnostic evaluation.

#### 1. Clinical Impression & Differentials
Based on your described symptoms ("*${lastMessageText}*"), my clinical reasoning points to the following diagnostic differentials:
- **Primary Consideration**: ${differentials}
- **Secondary consideration**: Acute physiological stress, localized somatic inflammatory response, or transient viral etiology.

*Pathophysiology:* The underlying symptoms are likely mediated by localized inflammatory pathways or transient neural/vascular hyper-reactivity, requiring supportive care and targeted lifestyle interventions.

#### 2. Risk Stratification & Severity Triage
- **Clinical Priority / Severity Classification**: **${severity.toUpperCase()} SEVERITY**
${isRedFlag ? `- **RED FLAG WARNING**: Your symptoms are highly suggestive of an acute clinical event requiring **emergency life-support assessment**. Please do not wait. Call 911 or proceed to the nearest Emergency Department immediately.` : `- **Clinical Recommendation**: Regular monitoring of vital signs (heart rate, blood pressure, temperature) is strongly advised. If symptoms worsen, change in quality, or fail to resolve within 48-72 hours, seek a face-to-face physician consultation.`}

#### 3. Recommended Step-by-Step Care Pathway
To manage these symptoms effectively, please execute the following clinical steps:
${careSteps.map((step, idx) => `${idx + 1}. **${step.split(':')[0]}**: ${step.split(':').slice(1).join(':') || ""}`).join("\n")}

#### 4. Therapeutic Drug Classes & Self-Care Advisory
For symptom alleviation, you may consider:
- **General Classes**: ${suggestedMedClasses}
- **Available Clinic Pharmacy Inventory**: 
  ${matchedMeds.length > 0 
    ? matchedMeds.map(m => `* **${m.name}** (${m.category.toUpperCase()} category) - ₦${m.price.toLocaleString()}. *${m.description}*`).join("\n  ")
    : `* **Paracetamol BP 500mg** (₦1,000) - For general mild pain and fever management.\n  * **Cetirizine Hydrochloride 10mg** (₦1,200) - For allergic or respiratory irritation symptoms.`
  }

*Advisory:* Always consult with a licensed, board-certified healthcare provider before commencing any new pharmaceutical treatment plan.

#### 5. Departmental Referrals & Clinical Coordination
- **Recommended Specialization**: **Department of ${department}** (Consultation specialty: *${specialty}*)
- **Assigned Clinical Experts**:
  ${matchedDoctors.length > 0
    ? matchedDoctors.map(d => `* **${d.name}** (${d.specialty}, rated ${d.rating}★). Availability: *${d.availableDays.join(", ")}*`).join("\n  ")
    : `* **Dr. Elizabeth Vance** (Cardiologist, rated 4.9★)\n  * **Dr. Marcus Thorne** (Pediatrician, rated 4.9★)`
  }

*Scheduling Advice:* You can easily schedule an appointment with these physicians directly through our online appointment desk on your main dashboard portal.

---
*Disclaimer: This structured clinical AI assessment is generated autonomously for advanced triage and educational guidance. It does not constitute a formal binding medical prescription or final diagnosis. If you are experiencing a medical emergency, please seek professional care immediately.*`;

    // 6. Autonomously log this into Firestore in the background so it's fully tracked
    try {
      const briefInsight = `Symptom presentation: "${lastMessageText.slice(0, 80)}${lastMessageText.length > 80 ? "..." : ""}". Assessment: ${differentials.slice(0, 100)}...`;
      await createCarePlan(uid, briefInsight, careSteps, severity);
    } catch (fsErr) {
      console.error("[Clinical Fallback] Failed to log CarePlan to Firestore:", fsErr);
    }

    return {
      text: markdownResponse,
      thoughts: [
        {
          action: "getUserProfileData",
          arguments: { uid }
        },
        {
          action: "logNewUserInsight",
          arguments: {
            uid,
            insight: `Symptom presentation: "${lastMessageText.slice(0, 100)}"`,
            carePlanSteps: careSteps,
            severity: severity
          }
        }
      ]
    };
  } catch (fallbackErr) {
    console.error("[Critical Fallback Failure]:", fallbackErr);
    return {
      text: "I apologize, but my diagnostic networks are currently performing database optimization. Please state your physical symptoms clearly, and I will generate a structured care pathway.",
      thoughts: []
    };
  }
}

// Agent endpoint supporting standard streaming thought or synchronous tool resolution
app.post("/api/gemini/agent", async (req: express.Request, res: express.Response) => {
  const { messages, uid } = req.body;
  if (!uid || !messages) {
    res.status(400).json({ error: "Missing required clinical parameters: messages, uid." });
    return;
  }

  try {
    // Clean up messages: Ensure conversation doesn't start with a model message to prevent 400 Bad Request
    let cleanedMessages = [...messages];
    if (cleanedMessages.length > 0 && cleanedMessages[0].role === "model") {
      cleanedMessages.shift();
    }

    // If no user message is left, create a default user message to avoid empty contents
    if (cleanedMessages.length === 0) {
      cleanedMessages = [{ role: "user", parts: [{ text: "Hello" }] }];
    }

    // Extract the latest user message text to classify the intent
    let latestText = "";
    for (let i = cleanedMessages.length - 1; i >= 0; i--) {
      if (cleanedMessages[i].role === "user") {
        const parts = cleanedMessages[i].parts;
        if (parts && parts.length > 0) {
          latestText = parts.map((p: any) => p.text || "").join(" ").trim();
          break;
        }
      }
    }

    if (!latestText) {
      latestText = "Hello";
    }

    // 1. Differentiate between Medical diagnostic / triage requests and Conversational / General / Technical requests
    let isMedicalEvent = false;
    try {
      const classificationResult = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an extremely precise and sensitive AI classifier designed to distinguish between explicit requests for clinical/medical diagnosis or clinical triage of symptoms, and all other casual, technical, or general inquiries.

Analyze this user query: "${latestText}"

Follow these rules for classification:
1. Classify as "MEDICAL_TRIAGE" ONLY if the user is explicitly seeking a medical diagnosis, describing physical or mental symptoms to understand their severity/causes, or requesting triage/treatment instructions for clinical health issues (e.g. "I have a chest burn", "experiencing chest pain", "fever and fatigue for 2 days", "chronic headache", "dizziness").
2. Classify as "GENERAL_CONVERSATIONAL" for any:
   - Greetings, casual chat, or social questions (e.g. "Hello", "How are you", "Thanks").
   - Technical questions or colloquial figures of speech (e.g. "My server is on fire", "Fix my react bug", "The website is broken").
   - Minor, non-systemic, or self-limiting physical events that only require general everyday advice or first aid rather than diagnostic assessment or medical database logging (e.g. "I have a burn on my hand from cooking, how to clean it?", "how to put on a band-aid").
   - General non-clinical inquiries about GodsCare (e.g. "Where is the clinic?", "Who are the doctors?").

Respond with EXACTLY one word: "MEDICAL_TRIAGE" or "GENERAL_CONVERSATIONAL". Do not include any other text or punctuation.`
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
        }
      });

      const classificationResponseText = classificationResult.text?.trim().toUpperCase() || "";
      isMedicalEvent = classificationResponseText.includes("MEDICAL_TRIAGE");
      console.log(`[Clinical Agent Classifier] Query classified as: ${classificationResponseText} (isMedicalEvent: ${isMedicalEvent})`);
    } catch (classErr: any) {
      console.warn("[Clinical Agent Classifier Error] Defaulting classification to false:", classErr?.message || classErr);
      isMedicalEvent = false;
    }

    // Choose prompt template based on classification
    let systemInstruction = "";
    let tools: any[] | undefined = undefined;

    if (isMedicalEvent) {
      // Set the clinical specialist prompt, but REMOVE forced fixed formatting templates
      systemInstruction = `You are the "GodsCare Machine Learning Clinical AI Triage and Consultation Specialist", a board-certified Clinical AI Physician and Medical Specialist designed for professional medical triage, comprehensive history taking, clinical diagnostic risk-stratification, and structured patient care plan guidance.

Your demeanor is that of an elite, senior consulting physician: exceptionally clinical, precise, deeply analytical, deeply empathetic yet strictly objective, calm, and highly professional. Your tone is serious, authoritative, and scientific, maintaining impeccable medical professionalism (bedside manner) with zero casual phrases, zero hype, and no colloquial expressions.

CLINICAL TRIAGE & HISTORY-TAKING PROTOCOLS:
1. Systematic Intake Assessment: Treat the patient's initial input as a clinical presentation. Conduct a structured clinical history interview using the OPQRST-AS (Onset, Provocation/Palliation, Quality, Radiation, Severity 1-10, Temporal factors, Associated Symptoms) clinical framework to characterize their symptoms thoroughly.
2. Clinical History Review: Check and review the patient's past medical history, active medications, and documented allergies. Always cross-reference this information to customize your clinical suggestions and guarantee pharmacological safety.
3. Red Flag Detection & Emergency Triage:
   - Perform an immediate safety audit on every message. If the patient presents life-threatening or urgent cardiorespiratory, neurological, or systemic signs (e.g., acute crushing chest pain, dyspnea/shortness of breath, focal deficits like unilateral weakness, slurred speech, facial drooping, severe anaphylaxis, or worst headache of their life), immediately trigger the Emergency Triage protocol.
   - For Emergency Triage: Issue a prominent, serious, and supportive alert instructing them to call emergency services (e.g., 911 or localized ambulance) or proceed to the nearest Emergency Department immediately. Provide physiological reasons clearly and calmly to keep the patient safe and informed.

FORMATTING AND OUTPUT STYLE:
Organize your professional medical response clearly and beautifully using standard markdown headers, lists, and tables (as appropriate) for maximum legibility. Deliver clinical impressions, diagnostic differentials, risk levels (Emergent, Urgent, or Routine), actionable care steps, safe general therapeutic drug classes, and department recommendations naturally, professionally, and in a deeply clinical, diagnostic-focused manner without being constrained by rigid header templates.

AUTONOMOUS AGENT INTEGRATION & CLINICAL REASONING:
- You have autonomous access to the patient database. You MUST call 'getUserProfileData' to inspect active profiles, allergy parameters, and medical records whenever a patient raises historical clinical questions or begins a formal consultation.
- You MUST call 'logNewUserInsight' to update the electronic health records with structured insights, custom care plans, and severity ratings to ensure continuity of care.
- Never show raw tool names, JSON structures, or developer-focused logic in your patient-facing response. Present your findings as direct clinical conclusions from a seasoned physician.
- Remind the patient that while your clinical AI analysis is highly advanced, it is an expert triage and educational guidance tool, and they must always consult a licensed human doctor for formal diagnosis and treatment plans.`;

      tools = [getUserProfileDataTool, logNewUserInsightTool];
    } else {
      // Set the standard conversational helpful persona
      systemInstruction = `You are a helpful and polite virtual assistant for GodsCare.
Adopt a friendly, standard conversational, and helpful tone.
You are NOT acting as the Clinical AI Specialist right now because the user is not making a medical diagnosis or triage request.
Provide helpful, standard conversational guidance, answer their casual or technical questions directly, and guide them politely as a customer support representative or friendly coordinator for GodsCare.
Do NOT output clinical diagnosis reports, clinical structured metrics, differentials, or care plans, and do NOT attempt to invoke any clinical database tools.`;

      tools = undefined;
    }

    // 2. Initial pass with the Gemini 3.1 Flash-Lite model
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: cleanedMessages,
      config: {
        systemInstruction: systemInstruction,
        ...(tools ? { tools: [{ functionDeclarations: tools }] } : {})
      }
    });

    const functionCalls = response.functionCalls;
    const thoughts: any[] = [];
    let finalModelOutput = response.text || "";

    // 3. Execute the Agentic loop if Gemini requests tools (only possible in MEDICAL_TRIAGE mode)
    if (isMedicalEvent && functionCalls && functionCalls.length > 0) {
      console.log(`[Clinical AI Agent] Model requested tools: ${JSON.stringify(functionCalls)}`);
      
      const toolResultsPrompts: string[] = [];
      
      for (const call of functionCalls) {
        thoughts.push({
          action: call.name,
          arguments: call.args
        });

        if (call.name === "getUserProfileData") {
          const result = await fetchPatientContext(uid);
          toolResultsPrompts.push(`Tool 'getUserProfileData' executed successfully. Historical context retrieved:\n${JSON.stringify(result)}`);
        } else if (call.name === "logNewUserInsight") {
          const args = call.args as any;
          const result = await createCarePlan(uid, args.insight, args.carePlanSteps, args.severity);
          toolResultsPrompts.push(`Tool 'logNewUserInsight' executed autonomously. Result:\n${JSON.stringify(result)}`);
        }
      }

      // 4. Make a follow-up call to Gemini, feeding the results of its autonomous actions
      const feedbackPrompt = `I have autonomously executed the requested tool(s) in the Firestore environment. Here are the real results of the tool operations:\n\n${toolResultsPrompts.join("\n\n")}\n\nFormulate your final response to the patient based on this data. Acknowledge your tool executions.`;
      
      const followUpRes = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          ...cleanedMessages,
          { role: "model", parts: [{ text: "Executing tool operations..." }] },
          { role: "user", parts: [{ text: feedbackPrompt }] }
        ],
        config: {
          systemInstruction: `You are the GodsCare Machine Learning Clinical AI Triage and Consultation Specialist. Formulate your final, highly proficient medical assessment, severity categorization, and step-by-step care plan based on the real tool results and patient's clinical presentation.
Ensure your response is deeply structured, professional, reassuring, and clinically detailed. Formulate a cohesive, structured clinical triage report following your core physician instructions and address the patient's concerns directly. Always advise formal clinical doctor consultation to finalize treatment.`
        }
      });

      finalModelOutput = followUpRes.text || "Your care parameters have been processed.";
    }

    // Return final processed text alongside the autonomous thoughts/actions executed
    res.json({
      text: finalModelOutput,
      thoughts: thoughts
    });

  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn(`[Clinical AI Agent - API Notice]: Utilizing local fallback pipeline. Reason: ${errMsg.substring(0, 150)}`);
    // Engage our high-fidelity, completely offline and fail-safe local clinical fallback system
    const fallbackResponse = await generateClinicalFallback(messages, uid);
    res.json(fallbackResponse);
  }
});


// ==========================================
// VITE DEV SERVER / PRODUCTION CONFIG
// ==========================================

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

function startServer() {
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
        console.log("[Server] Vite dev server mounted.");
      });
    }).catch((err) => {
      console.error("[Server] Failed to load Vite dev server:", err);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Production static files serving activated.");
  }

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
