# GodsCareHospital 🏥✨

GodsCareHospital is a highly polished, full-stack patient portal and healthcare management application. Designed for secure patient navigation and clinical administration, it integrates an **Autonomous Clinical AI Agent (Gemini 3.5)**, personalized health care pathways, and comprehensive custom medical billing & payment workflows.

---

## 🌟 Key Features

### 1. 🤖 Autonomous Clinical AI Agent
*   **Powered by Gemini 3.5 Flash:** Utilizing the modern `@google/genai` SDK.
*   **Intelligent Tool Calling:** The AI agent automatically executes tools to retrieve patient context (`getUserProfileData`) and autonomously logs diagnostic insights or structured lifestyle care plans (`logNewUserInsight`) directly into Firestore.
*   **Context-Aware Dialogues:** Explains medical reasoning, directs users to specialized wings (e.g., Cardiology, Dermatology, Pediatrics), and offers warm, patient-first health suggestions.

### 2. 🗃️ Secure Patient Portal
*   **Identity & Authentication:** Simple and secure registration/sign-in flows powered by **Firebase Authentication**.
*   **Physical Metrics & Health Tracking:** Tracks and visualizes patient vital signs, chronic conditions, physical records, allergies, and historical consultations.
*   **Personalized Care Pathways:** Real-time rendering of clinical advisories and actionable care plans generated dynamically by the medical AI agent.

### 3. 💳 Clinical Invoicing & Integrated Billing
*   **Global Fee Controls:** Hospital administrators can modify default clinical consultation booking fees and premium subscription fees globally.
*   **Pharmacy Drug Catalog:** Admin-managed therapeutic listings with customizable retail pricing, sickness categorizations, and descriptions.
*   **Custom Patient Ledger:** Allows generating, updating, voiding, or tracking medical bills for specific patient accounts.
*   **Paystack Checkout Integration:** Secure payment flow supporting real-time transactions. Includes an automatic **Sandbox fallback mode** for stress-free local development and evaluation without live bank credentials.

### 4. 👔 Unified Admin Console
*   **Clinical Records Overview:** Manage patient directories, appointments, doctors, and diagnostics.
*   **Dynamic Controls:** Real-time status toggles for appointments, billing records, and clinical logs.

---

## 🛠️ Technology Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
*   **Backend:** Node.js, Express (custom full-stack reverse-proxy server)
*   **Database & Security:** Firebase Firestore (NoSQL) with custom-tailored database rules
*   **Authentication:** Firebase Auth
*   **AI Engine:** Google GenAI `@google/genai` (Function calling & system instruction engines)
*   **Compilation & Bundling:** `esbuild` for superfast backend packaging, Vite asset compiler

---

## ⚙️ Environment Configuration

Define the following keys in your `.env` file at the root of the project:

```env
# Google Gemini AI API Access
GEMINI_API_KEY=your_gemini_api_key_here

# Paystack API Key (Actual payment checks)
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here
```

*Note: If `PAYSTACK_SECRET_KEY` is not supplied, the application automatically activates a highly realistic payment simulation sandbox to ensure feature availability.*

---

## 🚀 Getting Started

### 📦 Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### 🔧 Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/Husten150/Godscare.git
   cd Godscare
   ```
2. Install all required client and server dependencies:
   ```bash
   npm install
   ```

### 💻 Running Locally
To launch both the Node/Express backend and the integrated Vite asset pipeline in Hot Module Replacement (HMR) development mode:
```bash
npm run dev
```
The server will boot up and listen locally at:
👉 **`http://localhost:3000`**

### 🏗️ Production Build & Start
To compile and bundle the React client app alongside the backend Express TypeScript server:
```bash
npm run build
```
This script executes:
1.  `vite build` to package your frontend into static HTML/JS inside `dist/`.
2.  `esbuild` to compile `server.ts` into a self-contained, optimized CommonJS file (`dist/server.cjs`).

To start the production server:
```bash
npm run start
```

---

## 📂 Project Architecture

```text
├── server.ts               # Express full-stack entry point & backend routing
├── firebase-blueprint.json # Database structure representation
├── firestore.rules         # Security rules for Firestore collections
├── metadata.json           # Platform & capability configuration
├── package.json            # Scripts, commands, and workspace dependencies
├── src/
│   ├── App.tsx             # Root React component containing layout & core routers
│   ├── firebase.ts         # Initializer for Firestore, Auth, and Firebase Admin
│   ├── types.ts            # Core TypeScript model definitions and interface structures
│   ├── main.tsx            # DOM mounting and rendering logic
│   ├── index.css           # Global typography definitions, Tailwind imports, and custom animations
│   └── components/
│       ├── AdminPanel.tsx  # Admin dashboard (Ledger management, drug catalog, fees, clinical directories)
│       ├── Dashboard.tsx   # Patient hub (AI conversations, care pathways, diagnostic summaries, bills checkout)
│       ├── Auth.tsx        # Authentication modals and forms
│       ├── Home.tsx        # Responsive visitor landing experience
│       ├── Header.tsx      # Multi-state navigation header
│       ├── Footer.tsx      # Clean page layout footer
│       ├── Doctors.tsx     # Public medical experts listings and appointment scheduling
│       └── Departments.tsx # Specialty clinics directory (Cardiology, Pediatrics, etc.)
```

---

## 🔒 Security & Rules

All Firestore read and write scopes are governed by custom-tailored security rules defined in `firestore.rules`. Ensure rules are pushed to the Firebase console whenever modifying database schemas or collection rules.

---

## 🤝 Contributing

Contributions to GodsCareHospital are welcome!
1. Fork the project.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

Made with ❤️ by [Husten150](https://github.com/Husten150)
