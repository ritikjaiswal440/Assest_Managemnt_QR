// api_router.gs

/**
 * Global Database Binding
 * Purely relies on the active spreadsheet container.
 */
const ss = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Handle GET Requests
 */
function doGet(e) {
  // Acknowledge task route renders HTML page for engineers
  if (e && e.parameter && e.parameter.action === 'acknowledge' && e.parameter.childId) {
    const childId = e.parameter.childId;
    
    try {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      
      const sheet = ss.getSheetByName('Engineer_Tasks');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === childId) {
            // Append acknowledge timestamp to Action_Taken log
            const currentAction = data[i][3] || "";
            if (!currentAction.includes("Acknowledged At:")) {
              const updatedAction = currentAction + `\nAcknowledged At: ${new Date().toISOString()}`;
              sheet.getRange(i + 1, 4).setValue(updatedAction);
              logSystemAction("SYSTEM", `Task ${childId} acknowledged by engineer`);
            }
            break;
          }
        }
      }
      lock.releaseLock();
    } catch (err) {
      Logger.log("Acknowledge failed: " + err.message);
    }
    
    const htmlOutput = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
          h2 { color: #1a73e8; margin-bottom: 16px; }
          p { color: #5f6368; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <h2>Task Acknowledged</h2>
          <p>Thank you. Your acknowledgment has been recorded.</p>
          <p>You may safely close this window.</p>
        </div>
      </body>
      </html>
    `;
    return HtmlService.createHtmlOutput(htmlOutput).setTitle("Task Acknowledged");
  }

  if (e && e.parameter) {
    const action = e.parameter.action || e.parameter.route;
    if (action === 'getCompanies') {
      const companySheet = ss.getSheetByName('Company_Master');
      return jsonResponse(mapRowsToObjects(companySheet));
    }
    if (action === 'getComplaints') {
      const complaintsSheet = ss.getSheetByName('Intake_Queue');
      return jsonResponse(mapRowsToObjects(complaintsSheet));
    }
    if (action === 'getAssets') {
      const assetSheet = ss.getSheetByName('Asset_Master');
      return jsonResponse(mapRowsToObjects(assetSheet));
    }
  }

  return jsonResponse({ message: "GET request acknowledged. Monolithic API Online." });
}

/**
 * Handle OPTIONS Requests (CORS Preflight)
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST Requests
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Bad Request: Payload is missing or corrupt.");
    }
    const payload = JSON.parse(e.postData.contents);
    const action = e.parameter.action || payload.action || payload.route;

    if (!action) {
       throw new Error("Field Violation: Missing execution action reference.");
    }

    let responseData = null;

    switch (action) {
      case "loginUser":
      case "login":
        responseData = handleLogin(payload);
        break;

      case "getDropdownData":
        responseData = handleDropdownData();
        break;

      case "submitIntake":
      case "submitRequest":
      case "submitComplaint":
        responseData = handleSubmitIntake(payload);
        break;

      case "fetchIntakeQueue":
      case "getComplaints":
        responseData = handleFetchIntake();
        break;

      case "fetchMasterTickets":
        responseData = handleFetchMasterTickets();
        break;

      case "promoteTicket":
      case "pushToIntake":
        responseData = handlePromoteTicket(payload);
        break;

      case "getPublicAssetDetails":
        responseData = handleGetPublicAssetDetails(payload);
        break;
        
      case "generateQRSig":
        responseData = handleGenerateQRSig(payload);
        break;
        
      case "getDashboard":
        responseData = handleGetDashboard();
        break;

      case "getDashboardKPIs":
        responseData = handleGetDashboardKPIs(payload);
        break;
        
      case "getFailureTrends":
        responseData = handleGetFailureTrends(payload);
        break;
        
      case "createCompany":
        responseData = handleCreateCompany(payload);
        break;
        
      case "createAsset":
        responseData = handleCreateAsset(payload);
        break;
        
      case "updateCompany":
        responseData = handleUpdateCompany(payload);
        break;
        
      case "updateAsset":
        responseData = handleUpdateAsset(payload);
        break;

      case "assignTicket":
        responseData = handleTicketAssignmentRequest(payload);
        break;

      case "addParentRemark":
        responseData = handleParentRemarkRequest(payload);
        break;

      case "updateChildTicket":
        responseData = handleChildUpdateRequest(payload);
        break;

      case "trackTicket":
        responseData = handleTrackingRequest(payload);
        break;

      case "closeParentTicket":
        responseData = closeParentTicket(payload.parentId);
        break;

      case "pingEngineer":
        responseData = handlePingEngineerRequest(payload);
        break;

      case "resolveTicket":
        responseData = handleResolveTicket(payload);
        break;

      case "resolveTask":
        responseData = handleResolveTask(payload);
        break;

      case "fetchLogs":
        responseData = handleFetchLogs(payload);
        break;

      case "exportData":
        responseData = handleExportData(payload);
        break;

      case "importBulkData":
        responseData = handleImportBulk(payload);
        break;

      case "validateRef":
        responseData = handleValidateRef(payload);
        break;

      default:
        throw new Error("Routing Error: Unsupported action context -> [" + action + "]");
    }

    return jsonResponse(responseData);

  } catch (error) {
    return jsonResponse(null, false, error.message);
  }
}

/**
 * Strictly formats all responses to JSON
 */
function jsonResponse(data, success = true, errorMsg = "") {
  const response = {
    success: success,
    status: success ? "success" : "error",
    error: errorMsg,
    data: data
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Dynamic header indexing utility
 */
function getHeaders(sheet) {
  if (!sheet) return [];
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  if (range.isBlank()) return [];
  return range.getValues()[0].map(h => String(h).trim());
}

/**
 * Generic row mapping to objects
 */
function mapRowsToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = getHeaders(sheet);
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    results.push(obj);
  }
  return results;
}

/**
 * 1. User Authentication
 */
function handleLogin(payload) {
  const email = payload.email || payload.identifier;
  const password = payload.password;
  
  if (!email || !password) {
    throw new Error("Missing email or password in credentials.");
  }
  
  const sheet = ss.getSheetByName('System_Users');
  if (!sheet) {
    throw new Error("System_Users database configuration is missing.");
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = getHeaders(sheet);
  
  const emailIdx = headers.indexOf('Email');
  const passIdx = headers.indexOf('Password');
  const statusIdx = headers.indexOf('Status');
  const loginIdx = headers.indexOf('Last_Login');
  
  if (emailIdx === -1 || passIdx === -1) {
    throw new Error("Invalid User schema mapping.");
  }
  
  const targetEmail = email.trim().toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sheetEmail = String(row[emailIdx]).trim().toLowerCase();
    const sheetPass = String(row[passIdx]).trim();
    
    if (sheetEmail === targetEmail) {
      if (sheetPass === password) {
        if (statusIdx !== -1 && String(row[statusIdx]).trim().toLowerCase() !== 'active') {
          throw new Error("Access Denied: Account is currently deactivated.");
        }
        
        const timestamp = new Date().toISOString();
        if (loginIdx !== -1) {
          sheet.getRange(i + 1, loginIdx + 1).setValue(timestamp);
        }
        
        const userObj = {};
        headers.forEach((header, idx) => {
          if (header !== 'Password') {
            userObj[header] = row[idx];
          }
        });
        
        logSystemAction(sheetEmail, "User successfully logged in.");
        return userObj;
      } else {
        throw new Error("Invalid credentials.");
      }
    }
  }
  
  throw new Error("User does not exist.");
}

/**
 * 2. Fetch Dropdowns Data
 */
function handleDropdownData() {
  const companySheet = ss.getSheetByName('Company_Master');
  const assetSheet = ss.getSheetByName('Asset_Master');
  
  const companies = [];
  if (companySheet) {
    const data = companySheet.getDataRange().getValues();
    const headers = getHeaders(companySheet);
    const refIdx = headers.indexOf('Ref_Code');
    const nameIdx = headers.indexOf('Company_Name');
    const statusIdx = headers.indexOf('Status');
    
    for (let i = 1; i < data.length; i++) {
      companies.push({
        Ref_Code: data[i][refIdx],
        Company_Name: data[i][nameIdx],
        Status: statusIdx !== -1 ? data[i][statusIdx] : 'Active'
      });
    }
  }

  const assets = [];
  if (assetSheet) {
    const data = assetSheet.getDataRange().getValues();
    const headers = getHeaders(assetSheet);
    const refIdx = headers.indexOf('Asset_Ref');
    const compRefIdx = headers.indexOf('Company_Ref');
    const makeIdx = headers.indexOf('Make');
    const modelIdx = headers.indexOf('Model');
    const serialIdx = headers.indexOf('Serial_Number');
    
    for (let i = 1; i < data.length; i++) {
      assets.push({
        Asset_Ref: data[i][refIdx],
        Company_Ref: data[i][compRefIdx],
        Make: data[i][makeIdx],
        Model: data[i][modelIdx],
        Serial_Number: data[i][serialIdx]
      });
    }
  }

  return {
    companies: companies,
    assets: assets
  };
}

/**
 * Helper to generate sequential Intake ID (INQ-001)
 */
function generateIntakeId(sheet) {
  const values = sheet.getDataRange().getValues();
  let maxSeq = 0;
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0]);
    if (id.startsWith("INQ-")) {
      const seq = parseInt(id.replace("INQ-", ""), 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return `INQ-${nextSeq.toString().padStart(3, '0')}`;
}

/**
 * 3. Submit Staging Intake
 */
function handleSubmitIntake(payload) {
  const queueSheet = ss.getSheetByName('Intake_Queue');
  if (!queueSheet) {
    throw new Error("Intake_Queue sheet not configured.");
  }
  
  const intakeId = generateIntakeId(queueSheet);
  const source = payload.Source || payload.source || "Client_Portal";
  
  const cleanPayload = { ...payload };
  delete cleanPayload.Source;
  delete cleanPayload.source;
  delete cleanPayload.action;
  
  const timestamp = new Date().toISOString();
  const status = "Open";
  const assignedTo = payload.Assigned_To || payload.assignedTo || "";
  
  queueSheet.appendRow([
    intakeId,
    source,
    JSON.stringify(cleanPayload),
    timestamp,
    status,
    assignedTo,
    "Pending", // Sync_Status
    ""         // Request_ID
  ]);
  
  return {
    Intake_ID: intakeId,
    Status: "Open",
    Message: "Intake record successfully saved."
  };
}

/**
 * 4. Fetch Intake Queue
 */
function handleFetchIntake() {
  const sheet = ss.getSheetByName('Intake_Queue');
  return mapRowsToObjects(sheet);
}

/**
 * 5. Fetch Master Tickets
 */
function handleFetchMasterTickets() {
  const sheet = ss.getSheetByName('Master_Tickets');
  return mapRowsToObjects(sheet);
}

/**
 * Helper to calculate Indian Financial Year (e.g. 26-27)
 */
function getIndianFinancialYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); 
  let fyStart, fyEnd;
  
  if (month >= 3) { 
    fyStart = year;
    fyEnd = year + 1;
  } else { 
    fyStart = year - 1;
    fyEnd = year;
  }
  
  const startStr = fyStart.toString().slice(-2);
  const endStr = fyEnd.toString().slice(-2);
  return `${startStr}-${endStr}`;
}

/**
 * Helper to generate sequential Ticket ID (AVD/PT/26-27/0001)
 */
function generateMasterTicketId(sheet, fy) {
  const prefix = `AVD/PT/${fy}/`;
  const values = sheet.getDataRange().getValues();
  let maxSeq = 0;
  
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0]);
    if (id.startsWith(prefix)) {
      const parts = id.split('/');
      const numPart = parts[parts.length - 1];
      const seq = parseInt(numPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  
  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

/**
 * 6. Promote Intake Record to Master Ticket
 */
function handlePromoteTicket(payload) {
  const intakeId = payload.Intake_ID || payload.intakeId || payload.requestId;
  const assignedEngineer = payload.Assigned_Engineer || payload.assignedEngineer || "";
  
  if (!intakeId) {
    throw new Error("Missing Intake_ID reference.");
  }
  
  const queueSheet = ss.getSheetByName('Intake_Queue');
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  
  if (!queueSheet || !ticketSheet) {
    throw new Error("Database sheets missing.");
  }
  
  const queueData = queueSheet.getDataRange().getValues();
  const queueHeaders = getHeaders(queueSheet);
  const idIdx = queueHeaders.indexOf('Intake_ID');
  const statusIdx = queueHeaders.indexOf('Status');
  const payloadIdx = queueHeaders.indexOf('Payload');
  
  if (idIdx === -1 || statusIdx === -1 || payloadIdx === -1) {
    throw new Error("Queue columns are missing required schemas.");
  }
  
  let foundRowIndex = -1;
  let intakeRow = null;
  
  for (let i = 1; i < queueData.length; i++) {
    if (String(queueData[i][idIdx]).trim() === String(intakeId).trim()) {
      foundRowIndex = i + 1;
      intakeRow = queueData[i];
      break;
    }
  }
  
  if (foundRowIndex === -1) {
    throw new Error("Queue record not found: " + intakeId);
  }
  
  if (String(intakeRow[statusIdx]).trim().toLowerCase() === 'promoted') {
    throw new Error("This ticket has already been promoted.");
  }
  
  let pData = {};
  try {
    pData = JSON.parse(intakeRow[payloadIdx] || '{}');
  } catch (e) {
    Logger.log("Failed to parse payload: " + e.message);
  }
  
  // Update Intake_Queue row Status to Promoted
  queueSheet.getRange(foundRowIndex, statusIdx + 1).setValue("Promoted");
  
  const fy = getIndianFinancialYear(new Date());
  const ticketId = generateMasterTicketId(ticketSheet, fy);
  
  const refCode = pData.Ref_Code || pData.refCode || pData.ref || "";
  const companyName = pData.Company_Name || pData.companyName || pData.company || "";
  const location = pData.Location || pData.location || "";
  const serviceType = pData.Support_Type || pData.supportType || pData.billingFlag || "Standard";
  const openDate = new Date();
  
  // Append enriched row to Master_Tickets
  // Schema: ['Ticket_ID', 'Intake_ID_Ref', 'Ref_Code', 'Company_Name', 'Location', 'Service_Type', 'Status', 'Assigned_Engineer', 'Open_Date', 'Close_Date', 'Resolved_Days', 'Admin_Remarks']
  ticketSheet.appendRow([
    ticketId,
    intakeId,
    refCode,
    companyName,
    location,
    serviceType,
    "In Progress",
    assignedEngineer,
    openDate,
    "", // Close_Date
    "", // Resolved_Days
    ""  // Admin_Remarks
  ]);
  
  logSystemAction("SYSTEM", `Promoted intake ${intakeId} to ticket ${ticketId}`);

  return {
    Ticket_ID: ticketId,
    Status: "In Progress",
    Message: "Intake record successfully escalated to Master Ticket."
  };
}

/**
 * 7. Fetch Public Asset Details
 */
function handleGetPublicAssetDetails(params) {
  const { assetId, signature } = params;
  validateQRSignature(assetId, signature);
  
  const assetSheet = ss.getSheetByName('Asset_Master');
  if (!assetSheet) throw new Error("Asset registry not initialized.");
  
  const data = assetSheet.getDataRange().getValues();
  const headers = getHeaders(assetSheet);
  const refIdx = headers.indexOf('Asset_Ref');
  const compRefIdx = headers.indexOf('Company_Ref');
  const typeIdx = headers.indexOf('Asset_Type');
  const makeIdx = headers.indexOf('Make');
  const modelIdx = headers.indexOf('Model');
  const serialIdx = headers.indexOf('Serial_Number');
  const warrantyIdx = headers.indexOf('Warranty_End');

  let asset = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(assetId).trim()) {
      asset = {
        Asset_Ref: data[i][refIdx],
        Company_Ref: data[i][compRefIdx],
        Asset_Type: data[i][typeIdx],
        Make: data[i][makeIdx],
        Model: data[i][modelIdx],
        Serial_Number: data[i][serialIdx],
        Warranty_End: data[i][warrantyIdx]
      };
      break;
    }
  }

  if (!asset) {
    throw new Error("Asset not found in registry.");
  }
  
  let supportType = 'Unknown';
  let isExpired = false;
  
  if (asset.Company_Ref) {
    const companySheet = ss.getSheetByName('Company_Master');
    if (companySheet) {
      const compData = companySheet.getDataRange().getValues();
      const compHeaders = getHeaders(companySheet);
      const cRefIdx = compHeaders.indexOf('Ref_Code');
      const cNameIdx = compHeaders.indexOf('Company_Name');
      const cSupportIdx = compHeaders.indexOf('Support_Type');
      const cEndIdx = compHeaders.indexOf('AMC_End');

      for (let i = 1; i < compData.length; i++) {
        if (String(compData[i][cRefIdx]).trim() === String(asset.Company_Ref).trim()) {
          supportType = compData[i][cSupportIdx] || 'Standard';
          if (compData[i][cEndIdx]) {
            isExpired = new Date(compData[i][cEndIdx]) < new Date();
          }
          asset.CompanyName = compData[i][cNameIdx];
          asset.Location = compData[i][compHeaders.indexOf('Location')];
          break;
        }
      }
    }
  }

  return {
    assetId: asset.Asset_Ref,
    companyName: asset.CompanyName || 'N/A',
    location: asset.Location || 'N/A',
    productMake: asset.Make,
    productModel: asset.Model,
    productSerial: asset.Serial_Number,
    supportType: supportType,
    isExpired: isExpired,
    warrantyEndDate: asset.Warranty_End
  };
}

/**
 * Helper: Validate HMAC QR security signature
 */
function validateQRSignature(assetId, providedSignature) {
  const SECRET_KEY = "AV_DYNAMIC_SECURE_HMAC_KEY_2026"; 
  if (!assetId || !providedSignature) {
    throw new Error("403 Forbidden: Missing Security Signature.");
  }
  const signatureBytes = Utilities.computeHmacSha256Signature(assetId, SECRET_KEY);
  let hexString = signatureBytes.map(function(byte) {
    let hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  const expectedSignature = hexString.substring(0, 8);
  if (expectedSignature !== providedSignature) {
    throw new Error("403 Forbidden: Invalid Security Signature.");
  }
  return true;
}

/**
 * Admin utility to generate QR codes signatures
 */
function handleGenerateQRSig(params) {
  const SECRET_KEY = "AV_DYNAMIC_SECURE_HMAC_KEY_2026"; 
  const { assetId } = params;
  if (!assetId) {
    throw new Error("Missing assetId");
  }
  const signatureBytes = Utilities.computeHmacSha256Signature(assetId, SECRET_KEY);
  let hexString = signatureBytes.map(function(byte) {
    let hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  const signature = hexString.substring(0, 8);
  return { assetId: assetId, signature: signature };
}

/**
 * Fetch dashboard aggregated KPIs
 */
function handleGetDashboardKPIs(params) {
  const assetSheet = ss.getSheetByName('Asset_Master');
  const compSheet = ss.getSheetByName('Company_Master');
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  const intakeSheet = ss.getSheetByName('Intake_Queue');

  const assets = mapRowsToObjects(assetSheet);
  const companies = mapRowsToObjects(compSheet);
  const tickets = mapRowsToObjects(ticketSheet);
  const intakes = mapRowsToObjects(intakeSheet);

  const companyFilter = params.companyName || params.company || "";
  const locationFilter = params.location || "";
  const roomFilter = params.roomName || params.room || "";

  // Map intakes for room filtering and resolving make/model
  const intakeMap = {};
  intakes.forEach(inq => {
    let payloadObj = {};
    try {
      payloadObj = JSON.parse(inq.Payload || '{}');
    } catch (e) {}
    intakeMap[inq.Intake_ID] = { ...inq, payloadObj };
  });

  // Map company branches for AMC calculations
  const companyMap = {};
  companies.forEach(c => {
    const key = `${c.Ref_Code || ''}_${c.Company_Name || ''}`;
    companyMap[key] = c;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function parseDateValue(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    const timestamp = Date.parse(val);
    if (!isNaN(timestamp)) return new Date(timestamp);
    return null;
  }

  function getDaysRemaining(endDate) {
    const end = parseDateValue(endDate);
    if (!end) return null;
    const endNormalized = new Date(end.getTime());
    endNormalized.setHours(0, 0, 0, 0);
    const diff = endNormalized.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Calculate unique options for filters from all assets
  const companiesSet = new Set();
  const locationsSet = new Set();
  const roomsSet = new Set();

  assets.forEach(asset => {
    if (asset.Company_Name) companiesSet.add(asset.Company_Name);
    if (asset.Location) locationsSet.add(asset.Location);
    if (asset.Room_Name) roomsSet.add(asset.Room_Name);
  });

  const filterOptions = {
    companies: Array.from(companiesSet).sort(),
    locations: Array.from(locationsSet).sort(),
    rooms: Array.from(roomsSet).sort()
  };

  // Apply filters
  const filteredAssets = assets.filter(asset => {
    if (companyFilter && asset.Company_Name !== companyFilter) return false;
    if (locationFilter && asset.Location !== locationFilter) return false;
    if (roomFilter && asset.Room_Name !== roomFilter) return false;
    return true;
  });

  const filteredCompanies = companies.filter(c => {
    if (companyFilter && c.Company_Name !== companyFilter) return false;
    if (locationFilter && c.Location !== locationFilter) return false;
    return true;
  });

  const filteredTickets = tickets.filter(t => {
    if (companyFilter && t.Company_Name !== companyFilter) return false;
    if (locationFilter && t.Location !== locationFilter) return false;
    if (roomFilter) {
      const intakeId = t.Intake_ID_Ref;
      if (intakeId && intakeMap[intakeId]) {
        const payloadObj = intakeMap[intakeId].payloadObj;
        const assetRoom = payloadObj.roomName || payloadObj.Room_Name || "";
        if (assetRoom !== roomFilter) return false;
      } else {
        return false;
      }
    }
    return true;
  });

  let activeWarrantyAssets = 0;
  let expiredWarrantyAssets = 0;
  let comprehensiveAmcAssets = 0;
  let nonComprehensiveAmcAssets = 0;
  const expiringSoon = [];

  filteredAssets.forEach(asset => {
    // 1. Warranty Calculations
    const warrantyEnd = parseDateValue(asset.Warranty_End_Date);
    if (warrantyEnd) {
      if (warrantyEnd >= today) {
        activeWarrantyAssets++;
      } else {
        expiredWarrantyAssets++;
      }
    }

    // 2. AMC Calculations via company branch matching
    const compKey = `${asset.Ref_Code || ''}_${asset.Company_Name || ''}`;
    const company = companyMap[compKey];
    
    let isAmcActive = false;
    let amcEndDate = null;
    let supportType = "";

    if (company) {
      supportType = company.Support_Type || "";
      amcEndDate = parseDateValue(company.AMC_End_Date);
      if (amcEndDate && amcEndDate >= today) {
        isAmcActive = true;
      }
    }

    if (isAmcActive) {
      if (supportType.indexOf("Comprehensive") !== -1) {
        comprehensiveAmcAssets++;
      } else {
        nonComprehensiveAmcAssets++;
      }
    }

    // 3. Expiring Soon Calculations (within 30 days)
    const warrantyDays = getDaysRemaining(asset.Warranty_End_Date);
    const amcDays = amcEndDate ? getDaysRemaining(amcEndDate) : null;

    let minDays = null;
    if (warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 30) {
      minDays = warrantyDays;
    }
    if (amcDays !== null && amcDays >= 0 && amcDays <= 30) {
      if (minDays === null || amcDays < minDays) {
        minDays = amcDays;
      }
    }

    if (minDays !== null) {
      expiringSoon.push({
        assetId: asset.Unique_Product_Id,
        productMake: asset.ProductMake || "",
        productModel: asset.ProductModel || "",
        companyName: asset.Company_Name || "",
        daysRemaining: minDays
      });
    }
  });

  // Sort expiring assets by days remaining (most urgent first)
  expiringSoon.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    metrics: {
      totalAssets: filteredAssets.length,
      activeWarrantyAssets: activeWarrantyAssets,
      comprehensiveAmcAssets: comprehensiveAmcAssets,
      nonComprehensiveAmcAssets: nonComprehensiveAmcAssets,
      expiredWarrantyAssets: expiredWarrantyAssets,
      openComplaints: filteredTickets.filter(t => t.Status !== 'Closed').length
    },
    expiringSoon: expiringSoon,
    filterOptions: filterOptions
  };
}

/**
 * Group failures by make/model lines
 */
function handleGetFailureTrends(params) {
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  const tickets = mapRowsToObjects(ticketSheet);

  const companyFilter = params.companyName || params.company || "";
  const locationFilter = params.location || "";
  const roomFilter = params.roomName || params.room || "";

  const intakeSheet = ss.getSheetByName('Intake_Queue');
  const intakes = mapRowsToObjects(intakeSheet);
  const intakeMap = {};
  intakes.forEach(inq => {
    let payloadObj = {};
    try {
      payloadObj = JSON.parse(inq.Payload || '{}');
    } catch (e) {}
    intakeMap[inq.Intake_ID] = { ...inq, payloadObj };
  });

  const assetSheet = ss.getSheetByName('Asset_Master');
  const assets = mapRowsToObjects(assetSheet);
  const assetMap = {};
  assets.forEach(a => {
    assetMap[a.Unique_Product_Id] = a;
  });

  const failureCounts = {};

  tickets.forEach(t => {
    // Apply filters to ticket
    if (companyFilter && t.Company_Name !== companyFilter) return;
    if (locationFilter && t.Location !== locationFilter) return;

    // Room name filter and resolving make/model
    const intakeId = t.Intake_ID_Ref;
    let uniqueProductId = "";
    let productMake = "";
    let productModel = "";

    if (intakeId && intakeMap[intakeId]) {
      const payloadObj = intakeMap[intakeId].payloadObj;
      uniqueProductId = payloadObj.Unique_Product_Id || "";
      
      // If we don't have Unique_Product_Id but have products list, check first product
      if (!uniqueProductId && payloadObj.products && payloadObj.products.length > 0) {
        uniqueProductId = payloadObj.products[0].Unique_Product_Id || "";
        productMake = payloadObj.products[0].productMake || payloadObj.products[0].ProductMake || "";
        productModel = payloadObj.products[0].productModel || payloadObj.products[0].ProductModel || "";
      }

      // Check room filter
      const assetRoom = payloadObj.roomName || payloadObj.Room_Name || "";
      if (roomFilter && assetRoom !== roomFilter) return;
    } else {
      if (roomFilter) return; // If we have a room filter but no intake payload to check room, discard
    }

    // Resolve make/model from Asset_Master if we have Unique_Product_Id
    if (uniqueProductId && assetMap[uniqueProductId]) {
      const asset = assetMap[uniqueProductId];
      productMake = asset.ProductMake || productMake;
      productModel = asset.ProductModel || productModel;
    }

    // Format the key as "Make Model"
    let key = "";
    if (productMake && productModel) {
      key = `${productMake} ${productModel}`;
    } else if (productMake || productModel) {
      key = productMake || productModel;
    } else {
      key = "General Hardware";
    }

    failureCounts[key] = (failureCounts[key] || 0) + 1;
  });

  const trends = Object.keys(failureCounts).map(k => ({
    model: k,
    failures: failureCounts[k]
  }));

  return trends.sort((a, b) => b.failures - a.failures);
}

/**
 * Create company manually
 */
function handleCreateCompany(payload) {
  const sheet = ss.getSheetByName('Company_Master');
  sheet.appendRow([
    payload.Ref_Code,
    payload.Company_Name,
    payload.Location || '',
    payload.Branch || '',
    payload.Support_Type || 'Comprehensive AMC',
    payload.AMC_Start || '',
    payload.AMC_End || ''
  ]);
  return { success: true, message: "Company saved." };
}

/**
 * Create asset manually
 */
function handleCreateAsset(payload) {
  const sheet = ss.getSheetByName('Asset_Master');
  const newId = 'AVD/PD/' + String(sheet.getLastRow() + 1).padStart(6, '0');
  
  sheet.appendRow([
    newId,
    payload.refCode,
    payload.assetType || 'AV System',
    payload.productMake || '',
    payload.productModel || '',
    payload.productSerial || '',
    payload.warrantyEndDate || ''
  ]);
  return { id: newId, refCode: payload.refCode };
}

/**
 * Update company details
 */
function handleUpdateCompany(payload) {
  const sheet = ss.getSheetByName('Company_Master');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.originalKeys.Ref_Code) {
      sheet.getRange(i + 1, 2).setValue(payload.newData.Company_Name);
      sheet.getRange(i + 1, 3).setValue(payload.newData.Location || '');
      sheet.getRange(i + 1, 4).setValue(payload.newData.Branch || '');
      sheet.getRange(i + 1, 5).setValue(payload.newData.Support_Type || '');
      sheet.getRange(i + 1, 6).setValue(payload.newData.AMC_Start || '');
      sheet.getRange(i + 1, 7).setValue(payload.newData.AMC_End || '');
      return { success: true };
    }
  }
  throw new Error("Company not found.");
}

/**
 * Update asset details
 */
function handleUpdateAsset(payload) {
  const sheet = ss.getSheetByName('Asset_Master');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.getRange(i + 1, 2).setValue(payload.refCode);
      sheet.getRange(i + 1, 3).setValue(payload.assetType);
      sheet.getRange(i + 1, 4).setValue(payload.productMake);
      sheet.getRange(i + 1, 5).setValue(payload.productModel);
      sheet.getRange(i + 1, 6).setValue(payload.productSerial);
      sheet.getRange(i + 1, 7).setValue(payload.warrantyEndDate);
      return { success: true };
    }
  }
  throw new Error("Asset not found.");
}

/**
 * Assign ticket tasks to engineers
 */
function handleTicketAssignmentRequest(payload) {
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  const nextIdx = taskSheet.getLastRow() + 1;
  const taskId = `TSK-${nextIdx.toString().padStart(4, '0')}`;
  
  taskSheet.appendRow([
    taskId,
    payload.parentId,
    payload.engName,
    payload.engEmail || "",
    "Assigned", // Status
    new Date(), // Assigned_Date
    "",         // Closed_Date
    payload.instructions || "",
    ""          // Engineer_Remarks
  ]);

  const pSheet = ss.getSheetByName('Master_Tickets');
  const pData = pSheet.getDataRange().getValues();
  for (let i = 1; i < pData.length; i++) {
    if (pData[i][0] === payload.parentId) {
      pSheet.getRange(i + 1, 7).setValue("In Progress"); 
      pSheet.getRange(i + 1, 8).setValue(payload.engName); 
      break;
    }
  }
  
  return { success: true };
}

/**
 * Append parent administrative remark
 */
function handleParentRemarkRequest(payload) {
  logSystemAction(payload.actorEmail, payload.remark, "Admin Remark");
  const logSheet = ss.getSheetByName('System_Logs');
  const lastRow = logSheet.getLastRow();
  logSheet.getRange(lastRow, 5).setValue(payload.parentId); 
  return { success: true };
}

/**
 * Update child engineer subtasks
 */
function handleChildUpdateRequest(payload) {
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  const data = taskSheet.getDataRange().getValues();
  const headers = getHeaders(taskSheet);
  
  const idIdx = headers.indexOf('Task_ID');
  const statusIdx = headers.indexOf('Status');
  const remarksIdx = headers.indexOf('Engineer_Remarks');
  
  if (idIdx === -1 || statusIdx === -1) {
     throw new Error("Invalid Engineer_Tasks schema.");
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === String(payload.childId).trim()) {
      const rowNum = i + 1;
      taskSheet.getRange(rowNum, statusIdx + 1).setValue(payload.status);
      if (remarksIdx !== -1) {
        taskSheet.getRange(rowNum, remarksIdx + 1).setValue(payload.remark || '');
      }
      
      logSystemAction(payload.actorEmail, payload.remark, payload.status);
      evaluateAndEnforceParentStatus(payload.parentId);
      return { success: true };
    }
  }
  throw new Error("Task not found.");
}

/**
 * Automatically update parent ticket status to Ready to Close
 */
function evaluateAndEnforceParentStatus(parentId) {
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  const data = taskSheet.getDataRange().getValues();
  const headers = getHeaders(taskSheet);
  const ticketRefIdx = headers.indexOf('Ticket_ID_Ref');
  const statusIdx = headers.indexOf('Status');

  if (ticketRefIdx === -1 || statusIdx === -1) return;

  let allClosed = true;
  let hasTasks = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][ticketRefIdx]).trim() === String(parentId).trim()) {
      hasTasks = true;
      const status = String(data[i][statusIdx] || "").trim().toLowerCase();
      if (status !== 'closed' && status !== 'resolved') {
        allClosed = false;
        break;
      }
    }
  }

  if (hasTasks && allClosed) {
    const pSheet = ss.getSheetByName('Master_Tickets');
    const pData = pSheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      if (pData[i][0] === parentId) {
        pSheet.getRange(i + 1, 7).setValue("Ready to Close");
        break;
      }
    }
  }
}

/**
 * Closes parent operations ticket
 */
function closeParentTicket(parentId) {
  const pSheet = ss.getSheetByName('Master_Tickets');
  const pData = pSheet.getDataRange().getValues();
  for (let i = 1; i < pData.length; i++) {
    if (pData[i][0] === parentId) {
      pSheet.getRange(i + 1, 7).setValue("Closed"); 
      pSheet.getRange(i + 1, 10).setValue(new Date()); // Close_Date
      return { success: true };
    }
  }
  throw new Error("Ticket not found.");
}

/**
 * Dispatches engineer email notifications request
 */
function handlePingEngineerRequest(payload) {
  let email = getEngineerEmailByName(payload.engineerName);
  if (!email) email = payload.engineerEmail;
  if (!email) throw new Error("Could not resolve engineer email.");

  const subject = `[AVD ProSupport] Status Request: Ticket ${payload.parentId}`;
  const statusUpdateMarkup = `<p>An administrator is requesting status update on task ${payload.childId}.</p>`;
  const htmlOutput = generateBrandedHtmlEmailTemplate("Status Update Request", statusUpdateMarkup);

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlOutput,
    name: "AV Dynamic Operations"
  });

  return { success: true };
}

/**
 * Tracks tickets matching search keys
 */
function handleTrackingRequest(payload) {
  const searchId = (payload.trackingId || '').trim();
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  const tickets = mapRowsToObjects(ticketSheet);
  
  const matched = tickets.filter(t => t.Ticket_ID === searchId || t.Intake_ID_Ref === searchId);
  if (matched.length > 0) {
    return { tickets: matched };
  }
  
  const queueSheet = ss.getSheetByName('Intake_Queue');
  const queue = mapRowsToObjects(queueSheet);
  const matchedQueue = queue.filter(q => q.Intake_ID === searchId);
  
  if (matchedQueue.length > 0) {
    return {
      tickets: matchedQueue.map(q => ({
        Ticket_ID: "Pending Assignment",
        Intake_ID_Ref: q.Intake_ID,
        Status: "Received",
        Open_Date: q.Timestamp
      }))
    };
  }

  throw new Error("No ticket or request found matching standard tracking code.");
}

/**
 * Appends logs to System_Logs
 */
function logSystemAction(actorEmail, message, level = "INFO") {
  try {
    const logSheet = ss.getSheetByName('System_Logs');
    if (!logSheet) return;
    logSheet.appendRow([
      Utilities.getUuid(),
      new Date().toISOString(),
      level,
      message,
      actorEmail || 'SYSTEM'
    ]);
  } catch (e) {
    Logger.log("Log system fail: " + e.message);
  }
}

/**
 * Standard branded email templates
 */
function generateBrandedHtmlEmailTemplate(title, messageBody) {
  const structuralBrandLogoWebAddress = "https://avdynamic.co.in/wp-content/uploads/2025/07/Av-Dynamics-Logo-2-scaled.png";
  return `
  <div style="font-family: sans-serif; background-color: #f4f7f6; padding: 30px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="background-color: #2c3e50; padding: 25px; text-align: center;">
        <img src="${structuralBrandLogoWebAddress}" alt="AV Dynamic" style="max-height: 60px; margin-bottom: 10px;" />
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: normal;">${title}</h2>
      </div>
      <div style="padding: 30px; color: #333333; line-height: 1.6; font-size: 15px;">
        ${messageBody}
      </div>
      <div style="background-color: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d;">
        <p style="margin: 0;"><b>AV Dynamic LLP</b> | Audio-Visual Dynamic Pro-Support</p>
      </div>
    </div>
  </div>
  `;
}

/**
 * Log System Activity to System_Logs with [generateLogID(), Timestamp, Email, Action, Target, Remarks]
 */
function logSystemActivity(actorEmail, actionType, targetId, remarks) {
  try {
    const logSheet = ss.getSheetByName('System_Logs');
    if (!logSheet) return;
    const logId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    logSheet.appendRow([
      logId,
      timestamp,
      actorEmail || 'SYSTEM',
      actionType,
      targetId,
      remarks || ''
    ]);
  } catch (e) {
    Logger.log("logSystemActivity fail: " + e.message);
  }
}

/**
 * 8. Engineer Execution Loop: Resolve Ticket (from earlier phase, retained just in case)
 */
function handleResolveTicket(payload) {
  const ticketId = payload.Ticket_ID || payload.ticketId;
  const status = payload.Status || payload.status;
  const remarks = payload.Remarks || payload.remarks || payload.remark || "";
  
  if (!ticketId || !status) {
    throw new Error("Missing Ticket_ID or Status for resolution.");
  }

  const ticketSheet = ss.getSheetByName('Master_Tickets');
  if (!ticketSheet) throw new Error("Master_Tickets database configuration is missing.");

  const data = ticketSheet.getDataRange().getValues();
  const headers = getHeaders(ticketSheet);
  
  const idIdx = headers.indexOf('Ticket_ID');
  const statusIdx = headers.indexOf('Status');
  const remarksIdx = headers.indexOf('Admin_Remarks');
  const closeDateIdx = headers.indexOf('Close_Date');
  const openDateIdx = headers.indexOf('Open_Date');
  const resolvedDaysIdx = headers.indexOf('Resolved_Days');

  if (idIdx === -1 || statusIdx === -1) throw new Error("Invalid Master_Tickets schema mapping.");

  let foundRowIndex = -1;
  let openDateStr = null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === String(ticketId).trim()) {
      foundRowIndex = i + 1; // 1-indexed for Apps Script API
      if (openDateIdx !== -1) {
        openDateStr = data[i][openDateIdx];
      }
      break;
    }
  }

  if (foundRowIndex === -1) throw new Error("Ticket not found: " + ticketId);

  // Update Status
  ticketSheet.getRange(foundRowIndex, statusIdx + 1).setValue(status);
  
  // Update Remarks
  if (remarksIdx !== -1 && remarks) {
    const existingRemarks = String(data[foundRowIndex - 1][remarksIdx] || "").trim();
    const newRemarkEntry = `[${new Date().toISOString().split('T')[0]}] ${status}: ${remarks}`;
    const combinedRemarks = existingRemarks ? existingRemarks + "\\n" + newRemarkEntry : newRemarkEntry;
    ticketSheet.getRange(foundRowIndex, remarksIdx + 1).setValue(combinedRemarks);
  }

  // Process SLA if resolving or closing
  const isClosing = status.toLowerCase() === 'resolved' || status.toLowerCase() === 'closed';
  
  if (isClosing && closeDateIdx !== -1 && resolvedDaysIdx !== -1) {
    const closeDate = new Date();
    ticketSheet.getRange(foundRowIndex, closeDateIdx + 1).setValue(closeDate.toISOString());
    if (openDateStr) {
      const openDate = new Date(openDateStr);
      if (!isNaN(openDate.getTime())) {
        const resolvedDays = Math.ceil((closeDate - openDate) / (1000 * 60 * 60 * 24));
        ticketSheet.getRange(foundRowIndex, resolvedDaysIdx + 1).setValue(resolvedDays);
      }
    }
  }

  logSystemActivity(payload.actorEmail || 'SYSTEM', "STATUS_UPDATE_" + status, ticketId, remarks);

  return { Ticket_ID: ticketId, Status: status, Message: "Ticket successfully updated." };
}

/**
 * 9. Engineer Execution Loop: Resolve Task (Child Ticket Flow)
 */
function handleResolveTask(payload) {
  const { Task_ID, Ticket_ID_Ref, Status, Engineer_Email, Remarks } = payload;
  
  if (!Task_ID || !Ticket_ID_Ref || !Status) {
    throw new Error("Missing Task_ID, Ticket_ID_Ref, or Status.");
  }

  // Step A: Update Engineer_Tasks
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  if (taskSheet) {
    const taskData = taskSheet.getDataRange().getValues();
    const taskHeaders = getHeaders(taskSheet);
    const taskIdIdx = taskHeaders.indexOf('Task_ID');
    const taskStatusIdx = taskHeaders.indexOf('Status'); // Index 4 mapped? Let's use headers
    const taskCloseDateIdx = taskHeaders.indexOf('Closed_Date'); // Index 6 mapped? Let's use headers
    const taskRemarksIdx = taskHeaders.indexOf('Engineer_Remarks'); // Index 8 mapped? Let's use headers

    if (taskIdIdx !== -1) {
      for (let i = 1; i < taskData.length; i++) {
        if (String(taskData[i][taskIdIdx]).trim() === String(Task_ID).trim()) {
          const rowIndex = i + 1;
          if (taskStatusIdx !== -1) taskSheet.getRange(rowIndex, taskStatusIdx + 1).setValue(Status);
          if (taskRemarksIdx !== -1) taskSheet.getRange(rowIndex, taskRemarksIdx + 1).setValue(Remarks || "");
          if ((Status.toLowerCase() === 'resolved' || Status.toLowerCase() === 'closed') && taskCloseDateIdx !== -1) {
            taskSheet.getRange(rowIndex, taskCloseDateIdx + 1).setValue(new Date().toISOString());
          }
          break;
        }
      }
    }
  }

  // Step B: Update Master Ticket & SLA
  let updatedSlaDays = null;
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  if (ticketSheet) {
    const ticketData = ticketSheet.getDataRange().getValues();
    const ticketHeaders = getHeaders(ticketSheet);
    
    const idIdx = ticketHeaders.indexOf('Ticket_ID');
    const statusIdx = ticketHeaders.indexOf('Status');
    const openDateIdx = ticketHeaders.indexOf('Open_Date');
    const closeDateIdx = ticketHeaders.indexOf('Close_Date');
    const resolvedDaysIdx = ticketHeaders.indexOf('Resolved_Days');

    if (idIdx !== -1 && statusIdx !== -1) {
      for (let i = 1; i < ticketData.length; i++) {
        if (String(ticketData[i][idIdx]).trim() === String(Ticket_ID_Ref).trim()) {
          const rowIndex = i + 1;
          ticketSheet.getRange(rowIndex, statusIdx + 1).setValue(Status);

          // SLA Math
          if ((Status.toLowerCase() === 'resolved' || Status.toLowerCase() === 'closed') && openDateIdx !== -1 && closeDateIdx !== -1 && resolvedDaysIdx !== -1) {
            const closeDate = new Date();
            const openDateStr = ticketData[i][openDateIdx];
            ticketSheet.getRange(rowIndex, closeDateIdx + 1).setValue(closeDate.toISOString());
            
            if (openDateStr) {
              const openDate = new Date(openDateStr);
              if (!isNaN(openDate.getTime())) {
                updatedSlaDays = Math.ceil((closeDate - openDate) / (1000 * 60 * 60 * 24));
                ticketSheet.getRange(rowIndex, resolvedDaysIdx + 1).setValue(updatedSlaDays);
              }
            }
          }
          break;
        }
      }
    }
  }

  // Step C: Audit Trail
  logSystemActivity(Engineer_Email || 'SYSTEM', "STATUS_UPDATE_" + Status, Ticket_ID_Ref, Remarks);

  return {
    Task_ID: Task_ID,
    Ticket_ID_Ref: Ticket_ID_Ref,
    Status: Status,
    Resolved_Days: updatedSlaDays,
    Message: "Task execution logged and SLA recalculated."
  };
}

/**
 * 10. Fetch Logs for a Ticket
 */
function handleFetchLogs(payload) {
  const ticketId = payload.Ticket_ID;
  if (!ticketId) throw new Error("Missing Ticket_ID parameter.");

  const logSheet = ss.getSheetByName('System_Logs');
  if (!logSheet) return [];

  const logs = [];
  const data = logSheet.getDataRange().getValues();
  const headers = getHeaders(logSheet);
  
  const idIdx = headers.indexOf('Target_ID') !== -1 ? headers.indexOf('Target_ID') : 4; // Target ID usually column E (index 4)
  const timeIdx = headers.indexOf('Timestamp') !== -1 ? headers.indexOf('Timestamp') : 1;
  const actorIdx = headers.indexOf('Actor_Email') !== -1 ? headers.indexOf('Actor_Email') : 2;
  const actionIdx = headers.indexOf('Action_Type') !== -1 ? headers.indexOf('Action_Type') : 3;
  const remarksIdx = headers.indexOf('Remarks') !== -1 ? headers.indexOf('Remarks') : 5;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === String(ticketId).trim()) {
      logs.push({
        Timestamp: data[i][timeIdx],
        Actor: data[i][actorIdx],
        Action: data[i][actionIdx],
        Remarks: data[i][remarksIdx]
      });
    }
  }
  
  // Sort logs by timestamp descending
  logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

  return logs;
}

/**
 * Handle Export Data - returns the raw 2D array matrix of the sheet
 */
function handleExportData(payload) {
  const sheetName = payload.sheetName;
  if (!sheetName) {
    throw new Error("Export Error: Missing target sheetName.");
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Export Error: Sheet not found -> [" + sheetName + "]");
  }

  const values = sheet.getDataRange().getValues();
  return values;
}

/**
 * Handle Import Bulk Data - appends a 2D matrix directly using setValues
 */
function handleImportBulk(payload) {
  const sheetName = payload.sheetName;
  const dataMatrix = payload.dataMatrix;

  if (!sheetName) {
    throw new Error("Import Error: Missing target sheetName.");
  }
  if (!dataMatrix || !Array.isArray(dataMatrix) || dataMatrix.length === 0) {
    throw new Error("Import Error: Invalid or empty dataMatrix payload.");
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Import Error: Sheet not found -> [" + sheetName + "]");
  }

  const lock = LockService.getScriptLock();
  try {
    // Acquire a lock to prevent concurrent write collisions
    lock.waitLock(15000);

    const startRow = sheet.getLastRow() + 1;
    const numRows = dataMatrix.length;
    const numCols = dataMatrix[0].length;

    sheet.getRange(startRow, 1, numRows, numCols).setValues(dataMatrix);

    return {
      message: "Successfully imported " + numRows + " rows to " + sheetName + ".",
      importedCount: numRows
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Validate customer reference code (Ref_Code)
 */
function handleValidateRef(payload) {
  const refCode = payload.ref || payload.Ref_Code;
  if (!refCode) {
    throw new Error("Missing client reference code to validate.");
  }
  
  const companySheet = ss.getSheetByName('Company_Master');
  if (!companySheet) {
    throw new Error("Company_Master database not initialized.");
  }
  
  const data = companySheet.getDataRange().getValues();
  const headers = getHeaders(companySheet);
  const refIdx = headers.indexOf('Ref_Code');
  const nameIdx = headers.indexOf('Company_Name');
  
  if (refIdx === -1 || nameIdx === -1) {
    throw new Error("Invalid Company_Master schema mapping.");
  }
  
  const targetCode = String(refCode).trim().toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim().toLowerCase() === targetCode) {
      return {
        refCode: data[i][refIdx],
        companyName: data[i][nameIdx],
        success: true
      };
    }
  }
  
  throw new Error("Client reference code '" + refCode + "' is not registered.");
}

/**
 * Fetch main dashboard analytics and lists
 */
function handleGetDashboard() {
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  const intakeSheet = ss.getSheetByName('Intake_Queue');
  const taskSheet = ss.getSheetByName('Engineer_Tasks');

  if (!ticketSheet || !intakeSheet) {
    throw new Error("Database sheets missing for dashboard aggregation.");
  }

  const tickets = mapRowsToObjects(ticketSheet);
  const queue = mapRowsToObjects(intakeSheet);
  const tasks = taskSheet ? mapRowsToObjects(taskSheet) : [];

  let pendingIntake = 0;
  queue.forEach(item => {
    if (item.Status === 'Open') {
      pendingIntake++;
    }
  });

  let activeTickets = 0;
  let resolvedTickets = 0;
  let totalDays = 0;
  let closedCount = 0;

  tickets.forEach(t => {
    const status = t.Status || "";
    if (status === 'In Progress' || status === 'Pending Parts/Client') {
      activeTickets++;
    } else if (status === 'Resolved' || status === 'Closed') {
      resolvedTickets++;
    }

    if (status === 'Closed' || status === 'Resolved') {
      const days = parseFloat(t.Resolved_Days);
      if (!isNaN(days)) {
        totalDays += days;
        closedCount++;
      }
    }
  });

  const averageResolutionTime = closedCount > 0 ? Number((totalDays / closedCount).toFixed(1)) : 0;

  return {
    totalRequests: queue.length,
    pendingIntake: pendingIntake,
    activeTickets: activeTickets,
    resolvedTickets: resolvedTickets,
    averageResolutionTime: averageResolutionTime,
    parents: tickets,
    children: tasks,
    serviceRequests: queue
  };
}
