import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Load Firebase configuration from applet config JSON
let firebaseApp;
let db: any;
try {
  let configPath = path.join(__dirname, "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    configPath = path.join(process.cwd(), "firebase-applet-config.json");
  }
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
  const { email, amount, userId, paymentType, targetId, medicineName } = req.body;
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

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const reference = `gcare-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Sandbox fallback if no secret is ready
  if (!paystackSecret || paystackSecret === "dummy_key") {
    console.log(`[Billing Sandbox] Generating checkout simulation for ${email}, user ${userId}`);
    res.json({
      status: "simulation",
      reference,
      checkoutUrl: `/api/payments/simulate-gate?reference=${reference}&userId=${userId}&amount=${amount}&email=${encodeURIComponent(email)}&paymentType=${paymentType}&targetId=${cleanTargetId}&medicineName=${encodeURIComponent(cleanMedicineName)}`,
      message: "Sandbox billing gateway activated."
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
        callback_url: `${process.env.APP_URL || dynamicAppUrl}/api/payments/verify-callback?userId=${userId}`,
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
      console.warn("[Paystack Error]: Falling back to simulator. Error details:", data.message);
      res.json({
        status: "simulation",
        reference,
        checkoutUrl: `/api/payments/simulate-gate?reference=${reference}&userId=${userId}&amount=${amount}&email=${encodeURIComponent(email)}&paymentType=${paymentType}&targetId=${cleanTargetId}&medicineName=${encodeURIComponent(cleanMedicineName)}`,
        message: `Simulator activated (Paystack: ${data.message})`
      });
    }
  } catch (err: any) {
    console.error("[Paystack] Initialization Error:", err);
    res.json({
      status: "simulation",
      reference,
      checkoutUrl: `/api/payments/simulate-gate?reference=${reference}&userId=${userId}&amount=${amount}&email=${encodeURIComponent(email)}&paymentType=${paymentType}&targetId=${cleanTargetId}&medicineName=${encodeURIComponent(cleanMedicineName)}`,
      message: "Sandbox billing gateway activated."
    });
  }
});

// Serve local sandbox billing checkout simulator screen
app.get("/api/payments/simulate-gate", (req: express.Request, res: express.Response) => {
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>body { font-family: 'Inter', sans-serif; }</style>
      </head>
      <body class="bg-[#fbfbfc] flex items-center justify-center min-h-screen p-4 text-zinc-800">
        <div class="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-md space-y-6">
          <div class="space-y-2 text-center">
            <span class="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">Paystack Sandbox Gateway</span>
            <h1 class="text-xl font-extrabold tracking-tight font-display text-zinc-950">Secure Checkout</h1>
            <p class="text-xs text-zinc-500">Authorized Payment Gateway for GodsCareHospital</p>
          </div>
          
          <div class="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs font-mono space-y-2 text-zinc-700">
            <p><strong>Customer:</strong> ${email}</p>
            <p><strong>Payment Type:</strong> <span class="uppercase font-bold text-emerald-600">${paymentType}</span></p>
            <p><strong>Description:</strong> ${itemDesc}</p>
            <p><strong>Ref Code:</strong> ${reference}</p>
            <p class="text-sm pt-1 border-t border-zinc-200"><strong>Amount:</strong> <span class="text-zinc-950 font-extrabold">₦${amount} NGN</span></p>
          </div>

          <div class="space-y-2">
            <p class="text-[11px] text-zinc-500 leading-relaxed text-center">
              This is a secure simulation of the Paystack webhook/callback handshakes. Clicking the verify button completes the transaction in Firestore instantly.
            </p>
          </div>

          <div class="space-y-2.5">
            <button 
              id="confirmBtn"
              class="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Verify Sandbox Payment
            </button>
            <a 
              href="/"
              class="block w-full py-2.5 text-center border border-zinc-200 text-zinc-500 rounded-lg text-xs font-mono uppercase tracking-wider hover:bg-slate-50"
            >
              Cancel Transaction
            </a>
          </div>
        </div>
        
        <script>
          document.getElementById('confirmBtn').addEventListener('click', async () => {
            document.getElementById('confirmBtn').innerText = 'Processing with Firestore...';
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
                alert('Payment successfully verified! GodsCareHospital has processed your payment.');
                window.location.href = '/';
              } else {
                alert('Verification failed: ' + result.error);
              }
            } catch (err) {
              alert('Error verifying payment: ' + err.message);
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Verify transaction and update records in Firestore
app.post("/api/payments/verify", async (req: express.Request, res: express.Response) => {
  const { reference, userId, isSimulated, amount, paymentType, targetId, medicineName } = req.body;
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

    // 1. If simulated or sandbox reference, auto-verify
    if (isSimulated || reference.startsWith("gcare-") || !process.env.PAYSTACK_SECRET_KEY) {
      paymentVerified = true;
      console.log(`[Billing Sandbox] Verifying simulation payment for ${userId} (Type: ${finalPaymentType})`);
    } else {
      // 2. Call actual Paystack API to verify
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
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

  if (!reference) {
    res.redirect("/?payment=error&message=Missing+transaction+reference");
    return;
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret || paystackSecret === "dummy_key") {
      // Sandbox fallback
      res.redirect(`/?payment=success&reference=${reference}`);
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

      res.redirect(`/?payment=success&type=${finalPaymentType}&reference=${reference}`);
    } else {
      console.warn("[Paystack Callback] Verification failed:", data.message);
      res.redirect(`/?payment=error&message=${encodeURIComponent(data.message || "Unverified")}`);
    }
  } catch (err: any) {
    console.error("[Paystack Callback] Verification exception:", err);
    res.redirect(`/?payment=error&message=${encodeURIComponent(err.message || "Verification Exception")}`);
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

// Agent endpoint supporting standard streaming thought or synchronous tool resolution
app.post("/api/gemini/agent", async (req: express.Request, res: express.Response) => {
  const { messages, uid } = req.body;
  if (!uid || !messages) {
    res.status(400).json({ error: "Missing required clinical parameters: messages, uid." });
    return;
  }

  try {
    // 1. Initial tool-calling pass with the Gemini 3.5 Flash model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: messages,
      config: {
        systemInstruction: `You are Godscare, an elite, highly compassionate Agentic Clinical AI assistant.
Your goal is to provide patient guidance, health tracking, and automated advice.
You have access to custom tools to interact with the clinical environment.
- If the patient asks about their appointments, allergies, or previous visits, or when starting a consultation, you MUST execute getUserProfileData to gather real context first.
- If you formulate a concrete self-care advisory, lifestyle change, or structured health plan based on their symptoms, you MUST autonomously log it into Firestore using logNewUserInsight.
Always summarize your findings and announce what tools you are executing. Explain your clinical reasoning calmly and warmly. Do not give direct drug dosages, but refer to specific wings (Cardiology, Pediatrics, Dermatology) when relevant.`,
        tools: [{ functionDeclarations: [getUserProfileDataTool, logNewUserInsightTool] }]
      }
    });

    const functionCalls = response.functionCalls;
    const thoughts: any[] = [];
    let finalModelOutput = response.text || "";

    // 2. Execute the Agentic loop if Gemini requests tools
    if (functionCalls && functionCalls.length > 0) {
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

      // 3. Make a follow-up call to Gemini, feeding the results of its autonomous actions
      const feedbackPrompt = `I have autonomously executed the requested tool(s) in the Firestore environment. Here are the real results of the tool operations:\n\n${toolResultsPrompts.join("\n\n")}\n\nFormulate your final response to the patient based on this data. Acknowledge your tool executions.`;
      
      const followUpRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...messages,
          { role: "model", parts: [{ text: "Executing tool operations..." }] },
          { role: "user", parts: [{ text: feedbackPrompt }] }
        ],
        config: {
          systemInstruction: "You are the Godscare Clinical AI Agent. Present your final care pathway and clinical suggestions based on the actual tool results."
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
    console.error("[Clinical AI Agent Error]:", err);
    res.status(500).json({ error: "Clinical Agent encountered an evaluation error." });
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

async function startServer() {
  // Seed the system clinicians list
  await seedDoctorsCollection();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite dev server mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Production static files serving activated.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Godscare full-stack environment listening at http://localhost:${PORT}`);
  });
}

startServer();
