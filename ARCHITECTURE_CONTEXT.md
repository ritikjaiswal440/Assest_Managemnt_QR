# AVD Asset & Ticket Management System: Architecture Context

This document serves as the central "brain" and strict reference guide for all current business logic, database schemas, and feature behaviors of the AVD Asset & Ticket Management System.

## 1. System Overview & Tech Stack

*   **Frontend**: React.js, Vite (deployed to GitHub Pages via `base: './'`), Material Design 3 UI/UX, CSS Grid.
*   **Backend**: Google Apps Script (REST API).
*   **Database**: Google Sheets (AVD Asset Database).

## 2. Database Schemas (The 4 Master Sheets)

The system relies on 4 primary master sheets within the Google Sheets database.

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

### `Asset_Complaints_2026`
*   **Complaint_ID**
*   **Unique_Product_Id**
*   **Ref_Code**
*   **Company_Name**
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

### `Activity_Log_2026`
*   **Log_ID**
*   **Timestamp**
*   **Action**
*   **User**
*   **Entity_Type**
*   **Entity_ID**
*   **Details**

## 3. Core Architectural Decisions (CRITICAL)

*   **Parent-Child Billing Architecture**: **Ref_Code** (e.g., `COMP-001`) acts as the Parent (Umbrella Account) and **Company_Name** (e.g., Alpha Tech - Pune) acts as the Child (Branch). Uniqueness requires BOTH fields to ensure branches sharing a parent billing account are treated distinctly.
*   **Asset Assignment**: Assets inherit BOTH the **Ref_Code** and **Company_Name** to ensure precise billing and physical location tracking.
*   **HMAC QR Security**: QR codes are generated dynamically with a cryptographic signature to prevent users from guessing URLs. The URL format strictly adheres to `#/asset/{encoded_id}.{signature}`.

## 4. Business Logic & Smart Features

*   **Smart AMC Expiry (Frontend Override)**: The React UI implements dynamic date-based calculations. If `AMC_End_Date < Today`, the frontend forcibly renders the Status pill as **Expired** (with a red background) and the Support Type text as **Out Of Support**, overriding the raw database value to ensure real-time visibility into contract states.
*   **Warranty Math**: The **Warranty_End_Date** is auto-calculated using the **Warranty_Start_Date** combined with the selected Warranty Duration dropdown (e.g., 1 Year, 3 Years). Furthermore, **Warranty_Days_Left** is mathematically derived from the calculated End Date versus Today's date. **DLP_Period** remains an independent string value decoupled from this math.
*   **Sequential Asset IDs**: The backend handles the creation of sequential IDs by scanning the database to find the highest existing `AVD/PD/XXXXXX` sequence and auto-incrementing it sequentially upon the creation of a new asset.

## 5. Third-Party Integrations

*   **ProSupport Sync**: A custom sync engine (Cron Job) is responsible for pushing tickets and updates to the external ProSupport API based on their **Sync_Status** (Success, Pending, Failed).

## 6. Update Ledger (Changelog)

*(This section serves as a placeholder for future architectural updates, new logic rules, and schema migrations as the system scales.)*

*   **[2026-06-20]** - Initial Architecture Context document created to formalize Parent-Child architecture, QR HMAC security, Smart Expiry UI overrides, and backend syncing schemas.
