# AV Dynamic Asset Management & QR Complaint System

Welcome to the standalone **AV Dynamic Asset Management & QR Complaint System** frontend. This is an enterprise-grade standalone system designed to manage AV hardware inventories, track customer maintenance contracts (AMC), and process QR-enabled customer complaints. 

This frontend integrates with a separate Google Apps Script (GAS) API backend, which stores data securely in a Google Sheets database, and triggers cross-system service dispatches into the existing **AV Dynamic ProSupport** ticket ecosystem.

---

## 🚀 Key Features & Architectural Core

### 1. Multi-System Cross-Platform Architecture
- **Decoupled API Layer**: Built on a Database-Agnostic Design. The frontend communicates exclusively via generic JSON payloads via `src/services/assetApi.js`, utilizing `fetch` and `AbortControllers` for timeouts and cancellation.
- **Cross-System API Handshake**: When a complaint is submitted, the Asset GAS Backend records it and makes a server-to-server POST request to the external **ProSupport Ticket System API** to auto-generate a Service Request.
- **Support & Billing Triage**: Out of Support hardware (expired AMC or warranty) logs complaints but marks them as `Pending Quote` to halt automatic dispatch.

### 2. UI/UX Paradigm: Strict Google Material Design 3
- **Theme Constraints**: Fully custom CSS flexbox/grid layout. Zero Bootstrap or Tailwind components.
- **Harmonious Color Palette**:
  - Google Blue (`#1a73e8`)
  - Success Green (`#1e8e3e`)
  - Error Red (`#d93025`)
  - Text Primary (`#202124`)
  - Text Secondary (`#5f6368`)
- **Surfaces**: Global app background is a cool-gray (`#f8f9fa`). Cards, modals, and tables use pure solid white (`#ffffff`) with soft Material shadows and `border-radius: 16px`.
- **Inputs & Buttons**: Inputs use a light-gray background (`#f1f3f4`), transitioning to pure white with a 2px blue ring on `:focus`. All buttons are pill-shaped (`border-radius: 50px`).
- **Responsive Layout**: Designed for optimal scanning and interaction on mobile phones, tablets, and desktops.

### 3. QR Security & Public Portal Architecture
- **Verified Route URL**: `#/asset/{Unique_Product_Id}.{Signature}`
- **Dynamic HMAC Verification**: The signature is generated via HMAC_SHA256 dynamically. The backend recalculates and checks it on scan. Invalid signatures block public portal access.
- **Sanitized Public View**: Restricts data leakage. Sensitive data columns like MAC addresses, internal IP addresses, invoice details, and sales orders are stripped before serving the asset details to unauthenticated users.
- **Anti-Spam Rate Limiting**: The backend rejects complaints if one was already submitted for that specific product ID within the last 60 minutes.

---

## 📁 Project Structure

```
av-dynamic-prosupport/
├── public/                 # Static assets
├── src/
│   ├── components/         # Shared frontend components
│   ├── context/            # AuthContext (session state)
│   ├── pages/              # Portal Views
│   │   ├── AdminDashboardWrapper.jsx    # Company/Asset inventory and sync logs
│   │   ├── AdminDashboardWrapper.css    # Admin layout styling
│   │   ├── PublicComplaintPortal.jsx    # QR scan customer portal
│   │   ├── PublicComplaintPortal.css    # Portal layout styling
│   │   └── ... (existing ticket components)
│   ├── services/
│   │   ├── assetApi.js     # Standalone Asset REST API service layer
│   │   └── api.js          # Core ProSupport Ticket API client
│   ├── App.jsx             # HashRouter layout and auth gating
│   ├── index.css           # Material 3 typography and base variable tokens
│   └── main.jsx            # Application entry point
├── .env                    # Configured backend API endpoints
├── vite.config.js          # Vite configuration
└── package.json            # Scripts and react-router-dom configuration
```

---

## 🛠️ Setup & Local Installation

### 1. Prerequisites
Ensure you have Node.js (v18+) installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variable Configuration
Configure your `.env` file in the root directory:
```env
# Existing ProSupport System Endpoint
VITE_GAS_API_URL="https://script.google.com/macros/s/AKfycbwHzMVppO_Bnx8otna-41JtxP4eKQ-gOtco7ffIpOKDa92rqYEu042ueXg6JvvkpyGT/exec"

# Standalone Asset Management System Endpoint
VITE_ASSET_GAS_API_URL="https://script.google.com/macros/s/AKfycbYOUR_ASSET_GAS_API_URL/exec"
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```
The output will be bundled in the `/dist` directory, fully compatible with Github Pages deployment.

---

## 🔒 Security Policy
All public endpoints are strictly read-only for non-sensitive data and write-only for complaint logging, governed by backend Apps Script restrictions. Authenticators must log in to access the `/admin` dashboard.
