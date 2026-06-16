# 🚀 Production Deployment Guide: AV Dynamic Asset Management System

This document outlines the final production deployment steps required to configure the environment, establish secure cross-system APIs, and deploy the React frontend for the standalone AV Dynamic Asset Management System.

---

## Step 1: Google Apps Script Backend Deployment (Asset System)

The Asset Management Backend is a **100% separate, isolated codebase** from the primary ProSupport Ticket System. You must deploy it as an independent web application.

1. **Create the Project:** Navigate to [script.google.com](https://script.google.com) and create a New Project. Name it `AV-Dynamic-Asset-Backend-Production`.
2. **Transfer Codebase:** Copy the contents of every `.gs` file located locally inside the `/asset-gas-backend/` directory into this new Apps Script project. Create a corresponding `.gs` file in the online editor for each local file (e.g., `api_router.gs`, `database_core.gs`, `public_controller.gs`).
3. **Initialize the Database:** Attach a new Google Sheet to this script. Create exactly four sheets (tabs) with the following exact header rows:
    *   **`Company_Master`**: `id`, `name`, `amcStart`, `amcEnd`, `supportTier`, `status`
    *   **`Asset_Master`**: `id`, `uuid`, `refCode`, `companyName`, `location`, `roomName`, `productMake`, `productModel`, `productSerial`, `assetStatus`, `signature`, `MAC_ID`, `IP_Address`
    *   **`Asset_Complaints_2026`**: `id`, `assetId`, `clientName`, `clientEmail`, `clientPhone`, `description`, `timestamp`, `syncStatus`, `serviceRequestNo`, `billingFlag`
    *   **`Activity_Log_2026`**: `timestamp`, `level`, `component`, `action`, `message`, `details`
4. **Deploy as Web App:** 
    *   Click **Deploy** (top right) > **New Deployment**.
    *   Select type: **Web App**.
    *   Execute as: **Me**.
    *   Who has access: **Anyone**.
    *   Click **Deploy** and **Authorize** the script to interact with your Google Sheets.
    *   🚨 **CRITICAL**: Copy the generated **Current Web App URL**. You will need this for Step 2.

---

## Step 2: Environmental Configuration & Cross-Wiring (The Secret Handshake)

We must establish the secure pipeline bridging the public React portal, the Asset GAS Backend, and the Primary ProSupport Ticketing API.

### A. Asset Backend Script Properties (GAS)
In your Google Apps Script editor, navigate to **Project Settings (Gear Icon) > Script Properties**. Add the following variables:
*   `SECRET_KEY`: `[GENERATE_A_SECURE_RANDOM_STRING_HERE]` *(Used for HMAC-SHA256 signature verification. Never share this!)*
*   `PROSUPPORT_API_URL`: `[PASTE_THE_PRIMARY_TICKET_SYSTEM_WEB_APP_URL_HERE]` *(The webhook destination for the server-to-server handshake).*

### B. React Frontend Configuration
In the root directory of the React project, locate or create your `.env` file. Populate it with the Web App URL generated in Step 1.
```env
VITE_ASSET_GAS_API_URL="[PASTE_THE_ASSET_WEB_APP_URL_HERE]"
```

---

## Step 3: Frontend Build & HashRouter Deployment

The application is built using Vite and configured for deployment via GitHub Pages.

1. **Verify & Build:** Compile the React application for production.
   ```bash
   npm run build
   ```
2. **Deploy to GitHub Pages:** Push the compiled `dist/` payload to your repository's deployment branch (or use a tool like `gh-pages`).
   ```bash
   npm run deploy
   ```

> [!NOTE]
> **Why HashRouter?** We utilized `<HashRouter>` (e.g., `/#/asset/AVD-123.sig`) instead of the standard `BrowserRouter`. This is a critical architectural decision designed specifically for static hosts like GitHub Pages. It prevents the web server from throwing a `404 Not Found` error when a client scans a physical QR code linking directly to a deep URL subdirectory.

---

## Step 4: End-to-End Verification Check

Once the deployment is live, the administrator must perform the following 3-point inspection.

- [ ] **1. QR Security Test:** Scan an asset URL, but manually modify one character of the signature block in the browser address bar. Verify that the system intercepts the request and throws a strict `403 Authorization Block` on the public view.
- [ ] **2. Sanitization Test:** Load a valid public QR view. Press `F12` to open the Network Tab, inspect the payload returning from the `getPublicAssetDetails` endpoint, and guarantee that the `MAC_ID` and `IP_Address` fields are completely omitted from the JSON network payload.
- [ ] **3. Cross-API Handshake Test:** Submit a public complaint via the web form. Switch to the database and verify:
      *   The row appears in `Asset_Complaints_2026`.
      *   The `syncStatus` successfully upgrades from `Pending` to `Success`.
      *   A brand new Service Request row has appeared inside the primary ProSupport dashboard database confirming the webhook payload survived the transit.

**End of Deployment Guide**
