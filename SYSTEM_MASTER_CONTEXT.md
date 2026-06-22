# AVD Asset & Ticket Management Platform: System Master Context

This document is the ultimate source of truth for the entire end-to-end architecture, physical directory structure, security paradigms, and integration lifecycles of the AVD Asset & Ticket Management Platform. It serves as a macroscopic reference for future integrations, scaling, and LLM context.

## 1. Global Architecture & Infrastructure

### The Dual-System Paradigm
The platform is engineered using a completely isolated, decoupled dual-system paradigm:
*   **Frontend**: A static single-page application built with React.js and Vite, utilizing a `HashRouter`. It is hosted on GitHub Pages (via `base: './'`) for high availability and zero maintenance overhead.
*   **Backend**: A serverless REST API constructed entirely on Google Apps Script (GAS). This backend acts as the secure intermediary between the frontend and the underlying Google Sheets database.

### Directory Map
There is a strict separation of concerns within the repository:
*   `/src/asset-module/`: Contains the React UI, including all components, pages, hooks, and services related to the frontend user experience.
*   `/asset-gas-backend/`: Contains the Google Apps Script backend codebase, including API routers, controllers, database repositories, and background sync services.

### Environmental Handshake
The frontend and backend communicate securely using specific environment variables injected during deployment:
*   `VITE_ASSET_GAS_API_URL`: The entry point URL for the Google Apps Script Web App (Frontend).
*   `SECRET_KEY`: A cryptographic key used exclusively by the backend to sign and verify QR code URLs (Backend QR Security).
*   `PROSUPPORT_API_URL`: The endpoint used by the backend to push ticket data to the external ProSupport system (Backend Sync Target).

## 2. Database Master Schema (Google Sheets)

The system relies on 4 primary master tables in Google Sheets, acting as the central relational database.

### `Company_Master`
*   **Ref_Code**
*   **Company_Name**
*   **Location**
*   **Support_Type**
*   **AMC_Start_Date**
*   **AMC_End_Date**
*   **Primary_Contact**
*   **Primary_Email**
*   **Primary_Phone**
*   **Status**
*   **Created_At**

### `Asset_Master`
*   **Unique_Product_Id**
*   **Ref_Code**
*   **Company_Name**
*   **Location**
*   **Room_Name**
*   **ProductMake**
*   **ProductModel**
*   **ProductSerial**
*   **Sub_Location**
*   **Room_Type**
*   **Floor**
*   **Warranty_Start_Date**
*   **DLP_Period**
*   **Warranty_End_Date**
*   **Warranty_Days_Left**
*   **MAC_ID**
*   **IP_Address**
*   **Sales_Order**
*   **Invoice_No**
*   **Asset_Status**
*   **Created_At**
*   **Updated_At**

### `Asset_Complaints_YYYY`
*   **Complaint_ID**
*   **Unique_Product_Id**
*   **Ref_Code**
*   **Company_Name**
*   **Location**
*   **Sub_Location**
*   **Floor**
*   **Room_Type**
*   **Room_Name**
*   **ProductMake**
*   **ProductModel**
*   **SerialNumber**
*   **Asset_Status**
*   **Warranty_Start_Date**
*   **Warranty_End_Date**
*   **DLP_Period**
*   **Warranty_Days_Left**
*   **Requested_By**
*   **Client_Email**
*   **PhoneNumber**
*   **Description**
*   **Support_Type**
*   **Status**
*   **Sync_Status**
*   **Created_At**
*   **Request_ID**
*   **Parent_Ticket_ID**
*   **Assigned_Engineer**

### `Activity_Log_YYYY`
*   **Log_ID**
*   **Timestamp**
*   **Action**
*   **User**
*   **Entity_Type**
*   **Entity_ID**
*   **Details**

## 3. Core Business Logic & Data Models

### Parent-Child Entity Model
The system enforces a strict Parent-Child billing architecture:
*   **Parent Umbrella Account**: The `Ref_Code` (e.g., `COMP-001`) represents the primary corporate billing entity.
*   **Child Branch**: The `Company_Name` (e.g., `Alpha Tech - Pune`) represents the specific physical branch.
*   **Relationship**: Branches under the same umbrella share a `Ref_Code` but have unique `Company_Name`s with fully isolated AMC start and end dates. All Assets must store both fields to guarantee precise billing and tracking.

### Smart Overrides
To ensure accurate real-time data representation without constantly mutating the database, the React frontend dynamically calculates and overrides statuses on the fly:
*   If a branch's `AMC_End_Date` is in the past, the frontend forcibly renders the Status as **Expired** and overrides the Support Type to **Out Of Support**, entirely disregarding the raw string stored in the database.

### Warranty Math
Asset lifecycles are heavily automated:
*   The `Warranty_End_Date` is mathematically calculated by adding the selected Warranty Duration (e.g., 1 Year, 3 Years) to the `Warranty_Start_Date`.
*   The `Warranty_Days_Left` is dynamically inferred.
*   The `DLP_Period` (Defect Liability Period) is treated as an isolated, independent string value that does not trigger date math.

## 4. The 4 Core Platform Engines

### 1. Security & QR Engine
To prevent malicious URL guessing and unauthorized data scraping, the system uses cryptographic HMAC signatures.
*   The backend generates a unique cryptographic signature for every asset.
*   The frontend routes public users via `#/asset/{encoded_id}.{signature}`.
*   Upon scanning, the backend validates the signature. If valid, it returns a strictly sanitized asset payload, completely stripping sensitive network and billing data (e.g., MAC Address, IP Address, Invoice No).

### 2. The Sync Engine
A resilient background Webhook/Cron job system drives the platform's integration capabilities.
*   It periodically sweeps the `Asset_Complaints_YYYY` table.
*   Any tickets flagged as `Pending` or `Failed` are pushed to the external ProSupport API.
*   The engine updates the `Sync_Status` based on the external API response, ensuring zero dropped tickets.

### 3. Data Pipeline Engine
Manages the influx and exportation of heavy data arrays.
*   **Deduplication Strategy**: When ingesting new companies, it matches against the composite key of `Ref_Code` + `Company_Name` to prevent duplicate branches.
*   **Auto-Generation**: Asset IDs are strictly sequential. The engine queries the database for the highest existing sequence (e.g., `AVD/PD/000005`) and increments it securely (e.g., `AVD/PD/000006`) upon creation.

### 4. Analytics Engine
Offloads heavy KPI mathematical processing from the client's browser.
*   Calculations for Hardware Failure Trends, Warranty Expiries, and SLA breaches are computed entirely server-side (GAS).
*   The engine returns lightweight, pre-calculated JSON payloads, preventing client browser throttling and optimizing the mobile user experience.

## 5. Extensibility & Future Scaling

### Future Modules & Ledger
*(This section is reserved for tracking upcoming macroscopic architectural additions.)*

*   *Pending Module*: Preventive Maintenance (PM) Scheduling Logic
*   *Pending Module*: Inventory & Spare Parts Ledger
