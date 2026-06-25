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
      case "getEngineers":
        return handleGetEngineers();

      case "getCompanies":
        return handleGetCompanies();

      case "loginUser":
      case "login":
        return handleLogin(payload);

      case "getDropdownData":
        responseData = handleDropdownData();
        break;

      case "submitIntake":
      case "submitRequest":
      case "submitComplaint":
        return handleSubmitIntake(payload);

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
        
      case "getDashboard": return handleGetDashboard(payload);
        
      case "createMasterTicket": return handleCreateMasterTicket(payload);

      case "createTicket": return handleCreateTicket(payload);

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

      case "searchTicket":
        responseData = handleSearchTicket(payload);
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

      case "generateServiceReport":
        return handleGenerateServiceReport(payload);

      case "exportData":
        responseData = handleExportData(payload);
        break;

      case "importBulkData":
        responseData = handleImportBulk(payload);
        break;

      case "validateRef":
        responseData = handleValidateRef(payload);
        break;

      case "getAssets":
        return handleGetAssets();

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
    message: errorMsg,
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
  try {
    const email = payload.email || payload.identifier;
    const password = payload.password;
    
    if (!email || !password) {
      return jsonResponse(null, false, "Email and password are required.");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Resilient fuzzy search for the sheet to prevent trailing space errors
    const userSheet = ss.getSheets().find(s => s.getName().trim().toLowerCase() === "system_users");

    if (!userSheet) {
      return jsonResponse(null, false, "System Error: System_Users database not found.");
    }

    const data = userSheet.getDataRange().getValues();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Schema mapping: Email is Index 1, Password is Index 3
      if (row[1] === email && row[3] === password) {
        
        // Status check: Index 5
        if (row[5] !== "Active") {
          return jsonResponse(null, false, "Account is disabled. Please contact administration.");
        }

        // Update Last_Login timestamp (Index 6 -> Column G -> i+1 row, 7th column)
        userSheet.getRange(i + 1, 7).setValue(new Date().toISOString());

        // Return standard payload
        return jsonResponse({
          name: row[0],
          email: row[1],
          role: row[2],
          companyName: row[4]
        }, true, "Login successful");
      }
    }

    return jsonResponse(null, false, "Invalid email or password.");
  } catch (error) {
    return jsonResponse(null, false, "Server Error during authentication: " + error.message);
  }
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

  let assets = [];
  if (assetSheet) {
    assets = mapRowsToObjects(assetSheet).map(asset => ({
      ...asset,
      Asset_Ref: asset.Unique_Product_Id,
      Company_Ref: asset.Ref_Code,
      Make: asset.ProductMake,
      Model: asset.ProductModel,
      Serial_Number: asset.ProductSerial
    }));
  }

  return {
    companies: companies,
    assets: assets
  };
}

/**
 * REST Endpoint: Fetch list of Active Engineers
 */
function handleGetEngineers() {
  try {
    const userSheet = ss.getSheetByName('System_Users');
    if (!userSheet) {
      throw new Error("System_Users database not found.");
    }
    const data = userSheet.getDataRange().getValues();
    const headers = getHeaders(userSheet);
    
    const nameIdx = headers.indexOf("Name");
    const emailIdx = headers.indexOf("Email");
    const roleIdx = headers.indexOf("Role");
    
    if (nameIdx === -1 || emailIdx === -1 || roleIdx === -1) {
      throw new Error("System_Users schema mismatch.");
    }
    
    const engineers = [];
    for (let i = 1; i < data.length; i++) {
      const role = String(data[i][roleIdx] || "").trim();
      if (role.toLowerCase().indexOf("engineer") !== -1) {
        engineers.push({
          Name: data[i][nameIdx],
          Email: data[i][emailIdx],
          Role: role
        });
      }
    }
    return jsonResponse(engineers, true, "Engineers list loaded");
  } catch (err) {
    return jsonResponse(null, false, err.message);
  }
}

/**
 * REST Endpoint: Fetch list of Companies
 */
function handleGetCompanies() {
  try {
    const companySheet = ss.getSheetByName('Company_Master');
    if (!companySheet) {
      throw new Error("Company_Master database not found.");
    }
    const data = companySheet.getDataRange().getValues();
    const headers = getHeaders(companySheet);
    
    const nameIdx = headers.indexOf("Company_Name");
    
    if (nameIdx === -1) {
      throw new Error("Company_Master schema mismatch.");
    }
    
    // Use a Set to ensure unique company names
    const companiesSet = new Set();
    // Start from index 1 to skip headers
    for (let i = 1; i < data.length; i++) {
      const companyName = String(data[i][nameIdx] || "").trim();
      if (companyName) {
        companiesSet.add(companyName);
      }
    }
    
    const companies = Array.from(companiesSet);
    return jsonResponse(companies, true, "Companies list loaded");
  } catch (err) {
    return jsonResponse(null, false, err.message);
  }
}

/**
 * REST Endpoint: Fetch list of Assets
 */
function handleGetAssets() {
  try {
    const sheet = ss.getSheetByName('Asset_Master');
    if (!sheet) throw new Error("Asset_Master sheet not found");
    const assets = mapRowsToObjects(sheet);
    return jsonResponse(assets, true, "Assets loaded successfully");
  } catch (err) {
    return jsonResponse([], false, err.message);
  }
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
  const sheet = ss.getSheetByName('Intake_Queue');
  if (!sheet) {
    throw new Error("Intake_Queue sheet not configured.");
  }
  
  const newIntakeId = generateIntakeId(sheet);
  
  let fileUrl = "";
  const base64 = payload.Attachment_Base64 || payload.fileData;
  const fileName = payload.Attachment_Name || payload.fileName || "attachment";
  const mimeType = payload.Attachment_MimeType || payload.fileMimeType || "application/octet-stream";
  
  if (base64) {
    try {
      const decoded = Utilities.base64Decode(base64);
      const blob = Utilities.newBlob(decoded, mimeType, fileName);
      const file = DriveApp.getRootFolder().createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    } catch (err) {
      Logger.log("Failed to upload attachment to Google Drive: " + err.message);
    }
  }

  // Construct fallback single-product array if payload.products is missing or empty
  const productsArray = (payload.products && payload.products.length > 0)
    ? payload.products
    : [{
        uniqueId: payload.uniqueId || payload.Unique_Product_Id || (payload.payloadObj && payload.payloadObj.Unique_Product_Id) || "",
        salesOrder: payload.salesOrder || payload.Sales_Order || (payload.payloadObj && payload.payloadObj.Sales_Order) || "",
        invoiceNo: payload.invoiceNo || payload.Invoice_No || "",
        subLocation: payload.subLocation || payload.Sub_Location || (payload.payloadObj && payload.payloadObj.Sub_Location) || "",
        roomType: payload.roomType || payload.Room_Type || (payload.payloadObj && payload.payloadObj.Room_Type) || "",
        floor: payload.floor || payload.Floor || (payload.payloadObj && payload.payloadObj.Floor) || "",
        roomName: payload.roomName || payload.Room_Name || payload.room || (payload.payloadObj && payload.payloadObj.Room_Name) || "",
        productMake: payload.productMake || payload.ProductMake || (payload.payloadObj && payload.payloadObj.ProductMake) || "",
        productModel: payload.productModel || payload.ProductModel || (payload.payloadObj && payload.payloadObj.ProductModel) || "",
        productSerial: payload.productSerial || payload.ProductSerial || (payload.payloadObj && payload.payloadObj.ProductSerial) || "",
        macId: payload.macId || payload.MAC_ID || (payload.payloadObj && payload.payloadObj.MAC_ID) || "",
        ipAddress: payload.ipAddress || payload.IP_Address || (payload.payloadObj && payload.payloadObj.IP_Address) || "",
        warrantyStart: payload.warrantyStart || payload.Warranty_Start_Date || (payload.payloadObj && payload.payloadObj.Warranty_Start_Date) || "",
        dlpPeriod: payload.dlpPeriod || payload.DLP_Period || (payload.payloadObj && payload.payloadObj.DLP_Period) || "",
        warrantyEnd: payload.warrantyEnd || payload.Warranty_End_Date || (payload.payloadObj && payload.payloadObj.Warranty_End_Date) || "",
        warrantyDays: payload.warrantyDays || payload.Warranty_Days_Left || (payload.payloadObj && payload.payloadObj.Warranty_Days_Left) || "",
        assetStatus: payload.assetStatus || payload.Asset_Status || (payload.payloadObj && payload.payloadObj.Asset_Status) || ""
      }];

  const headers = getHeaders(sheet);
  const payloadString = payload.payloadObj ? JSON.stringify(payload.payloadObj) : "{}";

  productsArray.forEach(prod => {
    const newRow = headers.map(header => {
      switch (header) {
        case 'Intake_ID': return newIntakeId;
        case 'Source': return payload.source || payload.Source || "Manual";
        case 'Unique_Product_Id': return prod.uniqueId || prod.Unique_Product_Id || "";
        case 'Sales_Order': return prod.salesOrder || prod.Sales_Order || "";
        case 'Invoice_No': return prod.invoiceNo || prod.Invoice_No || "";
        case 'Ref_Code': return payload.ref || payload.refCode || payload.Ref_Code || "";
        case 'Company_Name': return payload.companyName || payload.Company_Name || "";
        case 'Location': return payload.location || payload.Location || "";
        case 'Sub_Location': return prod.subLocation || prod.Sub_Location || "";
        case 'Room_Type': return prod.roomType || prod.Room_Type || "";
        case 'Floor': return prod.floor || prod.Floor || "";
        case 'Room_Name': return payload.roomName || payload.Room_Name || prod.room || prod.Room_Name || prod.roomName || "";
        case 'ProductMake': return prod.productMake || prod.ProductMake || "";
        case 'ProductModel': return prod.productModel || prod.ProductModel || "";
        case 'ProductSerial': return prod.productSerial || prod.ProductSerial || "";
        case 'MAC_ID': return prod.macId || prod.MAC_ID || "";
        case 'IP_Address': return prod.ipAddress || prod.IP_Address || "";
        case 'Warranty_Start_Date': return prod.warrantyStart || prod.Warranty_Start_Date || "";
        case 'DLP_Period': return prod.dlpPeriod || prod.DLP_Period || "";
        case 'Warranty_End_Date': return prod.warrantyEnd || prod.Warranty_End_Date || "";
        case 'Warranty_Days_Left': return prod.warrantyDays || prod.Warranty_Days_Left || "";
        case 'Asset_Status': return prod.assetStatus || prod.Asset_Status || "";
        case 'Requester_Name': return payload.requesterName || payload.Requester_Name || "";
        case 'Client_Email': return payload.email || payload.Client_Email || "";
        case 'PhoneNumber': return payload.phoneNumber || payload.PhoneNumber || "";
        case 'Category': return payload.category || payload.Category || "";
        case 'Issue_Description': return payload.issueDescription || payload.Issue_Description || "";
        case 'Attachment_URL': return fileUrl || payload.Attachment_URL || "";
        case 'Status': return "Open";
        case 'Timestamp': return new Date().toISOString();
        case 'Payload': return payloadString;
        case 'Sync_Status': return "Pending";
        case 'Request_ID': return "";
        default: return "";
      }
    });
    sheet.appendRow(newRow);
  });
  
  return jsonResponse({ requestId: newIntakeId, Intake_ID: newIntakeId, complaintId: newIntakeId }, true, "Intake successful");
}

/**
 * 4. Fetch Intake Queue
 */
function handleFetchIntake() {
  const sheet = ss.getSheetByName('Intake_Queue');
  const rawIntakeObjects = mapRowsToObjects(sheet);
  return groupIntakeQueue(rawIntakeObjects);
}

/**
 * Helper to group separate Intake Queue rows with matching Intake_ID
 */
function groupIntakeQueue(rawIntakeObjects) {
  const grouped = {};
  rawIntakeObjects.forEach(row => {
    const intakeId = row.Intake_ID;
    if (!intakeId) return;

    // Place this safely above the grouped[intakeId] assignment
    let pObj = {};
    try { pObj = JSON.parse(row.Payload || '{}'); } catch(e){}
    const extractedUrl = row.Attachment_URL || pObj.Attachment_URL || pObj.attachmentUrl || pObj.invoiceUrl || "";

    if (!grouped[intakeId]) {
      grouped[intakeId] = {
        Intake_ID: intakeId,
        requestId: intakeId,
        Source: row.Source || "Manual",
        source: row.Source || "Manual",
        Timestamp: row.Timestamp,
        timestamp: row.Timestamp,
        Status: row.Status || "Open",
        status: row.Status || "Open",
        Company_Name: row.Company_Name,
        companyName: row.Company_Name,
        company: row.Company_Name,
        Location: row.Location,
        location: row.Location,
        Sub_Location: row.Sub_Location,
        subLocation: row.Sub_Location,
        Room_Name: row.Room_Name,
        roomName: row.Room_Name,
        room: row.Room_Name,
        Requester_Name: row.Requester_Name,
        requesterName: row.Requester_Name,
        reqBy: row.Requester_Name,
        Client_Email: row.Client_Email,
        clientEmail: row.Client_Email,
        email: row.Client_Email,
        PhoneNumber: row.PhoneNumber,
        phoneNumber: row.PhoneNumber,
        phone: row.PhoneNumber,
        Category: row.Category,
        category: row.Category,
        Issue_Description: row.Issue_Description,
        issueDescription: row.Issue_Description,
        description: row.Issue_Description,
        Description: row.Issue_Description,
        Attachment_URL: extractedUrl,
        attachmentUrl: extractedUrl,
        invoiceUrl: extractedUrl,
        products: [],
        archived: row.Status === "Archived" || row.Status === "Promoted"
      };
    } else {
      if (!grouped[intakeId].Attachment_URL && extractedUrl) {
        grouped[intakeId].Attachment_URL = extractedUrl;
        grouped[intakeId].attachmentUrl = extractedUrl;
        grouped[intakeId].invoiceUrl = extractedUrl;
      }
    }
    
    if (row.Unique_Product_Id || row.ProductSerial || row.ProductMake || row.ProductModel) {
      grouped[intakeId].products.push({
        uniqueId: row.Unique_Product_Id,
        uniqueProductId: row.Unique_Product_Id,
        Unique_Product_Id: row.Unique_Product_Id,
        salesOrder: row.Sales_Order,
        Invoice_No: row.Invoice_No,
        invoiceNo: row.Invoice_No,
        subLocation: row.Sub_Location,
        Sub_Location: row.Sub_Location,
        roomType: row.Room_Type,
        Room_Type: row.Room_Type,
        floor: row.Floor,
        Floor: row.Floor,
        room: row.Room_Name,
        roomName: row.Room_Name,
        Room_Name: row.Room_Name,
        productMake: row.ProductMake,
        ProductMake: row.ProductMake,
        brand: row.ProductMake,
        productModel: row.ProductModel,
        ProductModel: row.ProductModel,
        model: row.ProductModel,
        productSerial: row.ProductSerial,
        ProductSerial: row.ProductSerial,
        serial: row.ProductSerial,
        macId: row.MAC_ID,
        ipAddress: row.IP_Address,
        IP_Address: row.IP_Address,
        warrantyStart: row.Warranty_Start_Date,
        dlpPeriod: row.DLP_Period,
        warrantyEnd: row.Warranty_End_Date,
        warrantyDays: row.Warranty_Days_Left,
        assetStatus: row.Asset_Status
      });
    }
  });
  
  Object.keys(grouped).forEach(key => {
    const item = grouped[key];
    if (item.products.length > 0) {
      item.productMake = item.products[0].productMake;
      item.productModel = item.products[0].productModel;
      item.productSerial = item.products[0].productSerial;
    }
  });

  return Object.keys(grouped).map(key => grouped[key]);
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
  
  if (idIdx === -1 || statusIdx === -1) {
    throw new Error("Queue columns are missing required schemas.");
  }
  
  const uniqueProductIdIdx = queueHeaders.indexOf('Unique_Product_Id');
  const productSerialIdx = queueHeaders.indexOf('ProductSerial');
  const targetUniqueId = payload.Unique_Product_Id || payload.uniqueId || "";
  const targetSerial = payload.ProductSerial || payload.productSerial || "";

  let foundRowIndex = -1;
  let intakeRow = null;
  
  for (let i = 1; i < queueData.length; i++) {
    const rowIntakeId = String(queueData[i][idIdx]).trim();
    if (rowIntakeId === String(intakeId).trim()) {
      if (targetUniqueId || targetSerial) {
        const rowUniqueId = uniqueProductIdIdx !== -1 ? String(queueData[i][uniqueProductIdIdx]).trim() : "";
        const rowSerial = productSerialIdx !== -1 ? String(queueData[i][productSerialIdx]).trim() : "";
        
        const isMatchUnique = targetUniqueId && rowUniqueId && rowUniqueId === String(targetUniqueId).trim();
        const isMatchSerial = targetSerial && rowSerial && rowSerial === String(targetSerial).trim();
        
        if (!isMatchUnique && !isMatchSerial) {
          continue;
        }
      }
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
  
  // Update Intake_Queue row Status to Promoted
  queueSheet.getRange(foundRowIndex, statusIdx + 1).setValue("Promoted");
  
  const fy = getIndianFinancialYear(new Date());
  const ticketId = generateMasterTicketId(ticketSheet, fy);
  
  let refCode = "";
  let companyName = "";
  let location = "";
  let description = "";
  let requesterName = "";
  let clientEmail = "";
  let phoneNumber = "";
  let salesOrder = "";
  let subLocation = "";
  let roomName = "";
  let productMake = "";
  let productModel = "";
  let productSerial = "";
  let macId = "";
  let ipAddress = "";
  let warrantyEndDate = "";
  let category = "";
  let attachmentUrl = "";

  let uniqueProductId = "";
  let floor = "";
  let roomType = "";
  let warrantyStartDate = "";
  let dlpPeriod = "";
  let warrantyDaysLeft = "";
  let assetStatus = "";

  const attachColIdx = queueHeaders.indexOf('Attachment_URL');
  const directAttachment = attachColIdx !== -1 ? intakeRow[attachColIdx] : "";

  let pData = {};
  if (payloadIdx !== -1) {
    try {
      pData = JSON.parse(intakeRow[payloadIdx] || '{}');
    } catch (e) {
      Logger.log("Failed to parse payload: " + e.message);
    }
    refCode = pData.Ref_Code || pData.refCode || pData.ref || "";
    companyName = pData.Company_Name || pData.companyName || pData.company || "";
    location = pData.Location || pData.location || "";
    description = pData.description || pData.Description || "";
    requesterName = pData.requesterName || pData.Requester_Name || pData.reqBy || "";
    clientEmail = pData.clientEmail || pData.Client_Email || pData.email || "";
    phoneNumber = pData.phoneNumber || pData.PhoneNumber || pData.phone || "";
    salesOrder = pData.salesOrder || pData.Sales_Order || "";
    subLocation = pData.subLocation || pData.Sub_Location || "";
    roomName = pData.roomName || pData.Room_Name || pData.room || "";
    productMake = pData.productMake || pData.ProductMake || "";
    productModel = pData.productModel || pData.ProductModel || "";
    productSerial = pData.productSerial || pData.ProductSerial || "";
    macId = pData.macId || pData.MAC_ID || "";
    ipAddress = pData.ipAddress || pData.IP_Address || "";
    warrantyEndDate = pData.warrantyEndDate || pData.Warranty_End_Date || "";
    category = pData.category || pData.Category || "";
    attachmentUrl = directAttachment || pData.Attachment_URL || pData.attachmentUrl || pData.invoiceUrl || "";

    uniqueProductId = pData.Unique_Product_Id || pData.uniqueId || "";
    floor = pData.Floor || pData.floor || "";
    roomType = pData.Room_Type || pData.roomType || "";
    warrantyStartDate = pData.Warranty_Start_Date || pData.warrantyStart || "";
    dlpPeriod = pData.DLP_Period || pData.dlpPeriod || "";
    warrantyDaysLeft = pData.Warranty_Days_Left || pData.warrantyDays || "";
    assetStatus = pData.Asset_Status || pData.assetStatus || pData.Active || "Active";
  } else {
    // New schema mapping
    const refCodeIdx = queueHeaders.indexOf('Ref_Code');
    const compNameIdx = queueHeaders.indexOf('Company_Name');
    const descIdx = queueHeaders.indexOf('Issue_Description');
    const prodIdIdx = queueHeaders.indexOf('Unique_Product_Id');
    const locIdx = queueHeaders.indexOf('Location');
    const subLocIdx = queueHeaders.indexOf('Sub_Location');
    const roomNameIdx = queueHeaders.indexOf('Room_Name');
    const makeIdx = queueHeaders.indexOf('ProductMake');
    const modelIdx = queueHeaders.indexOf('ProductModel');
    const serialIdx = queueHeaders.indexOf('ProductSerial');
    const macIdx = queueHeaders.indexOf('MAC_ID');
    const ipIdx = queueHeaders.indexOf('IP_Address');
    const warrantyEndIdx = queueHeaders.indexOf('Warranty_End_Date');
    const catIdx = queueHeaders.indexOf('Category');
    const attachIdx = queueHeaders.indexOf('Attachment_URL');
    const reqNameIdx = queueHeaders.indexOf('Requester_Name');
    const emailIdx = queueHeaders.indexOf('Client_Email');
    const phoneIdx = queueHeaders.indexOf('PhoneNumber');
    const salesOrderIdx = queueHeaders.indexOf('Sales_Order');

    const floorIdx = queueHeaders.indexOf('Floor');
    const roomTypeIdx = queueHeaders.indexOf('Room_Type');
    const warrantyStartIdx = queueHeaders.indexOf('Warranty_Start_Date');
    const dlpPeriodIdx = queueHeaders.indexOf('DLP_Period');
    const warrantyDaysLeftIdx = queueHeaders.indexOf('Warranty_Days_Left');
    const assetStatusIdx = queueHeaders.indexOf('Asset_Status');
    
    refCode = refCodeIdx !== -1 ? intakeRow[refCodeIdx] : "";
    companyName = compNameIdx !== -1 ? intakeRow[compNameIdx] : "";
    description = descIdx !== -1 ? intakeRow[descIdx] : "";
    location = locIdx !== -1 ? intakeRow[locIdx] : "";
    subLocation = subLocIdx !== -1 ? intakeRow[subLocIdx] : "";
    roomName = roomNameIdx !== -1 ? intakeRow[roomNameIdx] : "";
    productMake = makeIdx !== -1 ? intakeRow[makeIdx] : "";
    productModel = modelIdx !== -1 ? intakeRow[productModel] : "";
    productSerial = serialIdx !== -1 ? intakeRow[serialIdx] : "";
    macId = macIdx !== -1 ? intakeRow[macIdx] : "";
    ipAddress = ipIdx !== -1 ? intakeRow[ipIdx] : "";
    warrantyEndDate = warrantyEndIdx !== -1 ? intakeRow[warrantyEndIdx] : "";
    category = catIdx !== -1 ? intakeRow[catIdx] : "";
    attachmentUrl = attachIdx !== -1 ? intakeRow[attachIdx] : "";
    requesterName = reqNameIdx !== -1 ? intakeRow[reqNameIdx] : "";
    clientEmail = emailIdx !== -1 ? intakeRow[emailIdx] : "";
    phoneNumber = phoneIdx !== -1 ? intakeRow[phoneIdx] : "";
    salesOrder = salesOrderIdx !== -1 ? intakeRow[salesOrderIdx] : "";

    uniqueProductId = prodIdIdx !== -1 ? intakeRow[prodIdIdx] : "";
    floor = floorIdx !== -1 ? intakeRow[floorIdx] : "";
    roomType = roomTypeIdx !== -1 ? intakeRow[roomTypeIdx] : "";
    warrantyStartDate = warrantyStartIdx !== -1 ? intakeRow[warrantyStartIdx] : "";
    dlpPeriod = dlpPeriodIdx !== -1 ? intakeRow[dlpPeriodIdx] : "";
    warrantyDaysLeft = warrantyDaysLeftIdx !== -1 ? intakeRow[warrantyDaysLeftIdx] : "";
    assetStatus = assetStatusIdx !== -1 ? intakeRow[assetStatusIdx] : "";
    
    if (uniqueProductId && !location) {
      const assetSheet = ss.getSheetByName("Asset_Master");
      if (assetSheet) {
        const assetData = assetSheet.getDataRange().getValues();
        const assetHeaders = getHeaders(assetSheet);
        const aIdIdx = assetHeaders.indexOf("Unique_Product_Id");
        const aLocIdx = assetHeaders.indexOf("Location");
        for (let i = 1; i < assetData.length; i++) {
          if (String(assetData[i][aIdIdx]).trim() === String(uniqueProductId).trim()) {
            location = assetData[i][aLocIdx];
            break;
          }
        }
      }
    }
  }

  const openDate = new Date().toISOString();
  const tData = {
    Category: pData.Category || category || "",
    Attachment_URL: attachmentUrl || "",
    Service_Type: pData.Support_Type || pData.serviceType || payload.Service_Type || payload.serviceType || "General"
  };

  const newMasterRow = [
    ticketId,                                                           // 1. Ticket_ID
    intakeId,                                                           // 2. Intake_ID_Ref (The Batch ID)
    pData.Ref_Code || refCode || "",                                    // 3. Ref_Code (The Company Code)
    pData.Company_Name || companyName || "",                            // 4. Company_Name
    pData.Requester_Name || requesterName || "",                        // 5. Requester_Name
    pData.Client_Email || clientEmail || "",                            // 6. Client_Email
    pData.PhoneNumber || phoneNumber || "",                             // 7. PhoneNumber
    pData.Location || location || "",                                   // 8. Location
    pData.Sub_Location || subLocation || "",                            // 9. Sub_Location
    pData.Room_Name || roomName || "",                                  // 10. Room_Name
    pData.ProductMake || productMake || "",                            // 11. ProductMake
    pData.ProductModel || productModel || "",                          // 12. ProductModel
    pData.ProductSerial || productSerial || "",                        // 13. ProductSerial
    pData.MAC_ID || macId || "",                                        // 14. MAC_ID
    pData.IP_Address || ipAddress || "",                                // 15. IP_Address
    pData.Sales_Order || salesOrder || "",                              // 16. Sales_Order
    pData.Warranty_End_Date || warrantyEndDate || "",                    // 17. Warranty_End_Date
    tData.Category || "",                  // 18. Category
    tData.Attachment_URL || "",            // 19. Attachment_URL
    tData.Service_Type || "General",       // 20. Service_Type
    "In Progress",                                                      // 21. Status
    assignedEngineer || "",                                             // 22. Assigned_Engineer
    openDate,                                                           // 23. Open_Date
    "",                                                                 // 24. Close_Date
    "",                                                                 // 25. Resolved_Days
    pData.Admin_Remarks || pData.Description || pData.description || description || "", // 26. Admin_Remarks
    pData.Unique_Product_Id || uniqueProductId || "",                  // 27. Unique_Product_Id (NEW)
    pData.Floor || floor || "",                                         // 28. Floor (NEW)
    pData.Room_Type || roomType || "",                                  // 29. Room_Type (NEW)
    pData.Warranty_Start_Date || warrantyStartDate || "",               // 30. Warranty_Start_Date (NEW)
    pData.DLP_Period || dlpPeriod || "",                                // 31. DLP_Period (NEW)
    pData.Warranty_Days_Left || warrantyDaysLeft || "",                 // 32. Warranty_Days_Left (NEW)
    pData.Asset_Status || assetStatus || "Active",                       // 33. Asset_Status (NEW)
    pData.Issue_Type || pData.issueType || ""                            // 34. Issue_Type (NEW)
  ];

  ticketSheet.appendRow(newMasterRow);
  
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
  const refIdx = headers.indexOf('Unique_Product_Id');
  const compRefIdx = headers.indexOf('Ref_Code');
  const typeIdx = headers.indexOf('Room_Type');
  const makeIdx = headers.indexOf('ProductMake');
  const modelIdx = headers.indexOf('ProductModel');
  const serialIdx = headers.indexOf('ProductSerial');
  const warrantyIdx = headers.indexOf('Warranty_End_Date');
  
  const locIdx = headers.indexOf('Location');
  const subLocIdx = headers.indexOf('Sub_Location');
  const floorIdx = headers.indexOf('Floor');
  const roomNameIdx = headers.indexOf('Room_Name');
  const warrantyStartIdx = headers.indexOf('Warranty_Start_Date');
  const dlpIdx = headers.indexOf('DLP_Period');
  const daysLeftIdx = headers.indexOf('Warranty_Days_Left');
  const assetStatusIdx = headers.indexOf('Asset_Status');
  const salesOrderIdx = headers.indexOf('Sales_Order');
  const invoiceNoIdx = headers.indexOf('Invoice_No');
  const macIdx = headers.indexOf('MAC_ID');
  const ipIdx = headers.indexOf('IP_Address');

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
        Warranty_End: data[i][warrantyIdx],
        Location: locIdx !== -1 ? data[i][locIdx] : '',
        Sub_Location: subLocIdx !== -1 ? data[i][subLocIdx] : '',
        Floor: floorIdx !== -1 ? data[i][floorIdx] : '',
        Room_Name: roomNameIdx !== -1 ? data[i][roomNameIdx] : '',
        Warranty_Start: warrantyStartIdx !== -1 ? data[i][warrantyStartIdx] : '',
        DLP_Period: dlpIdx !== -1 ? data[i][dlpIdx] : '',
        Days_Left: daysLeftIdx !== -1 ? data[i][daysLeftIdx] : '',
        Asset_Status: assetStatusIdx !== -1 ? data[i][assetStatusIdx] : 'Active',
        Sales_Order: salesOrderIdx !== -1 ? data[i][salesOrderIdx] : '',
        Invoice_No: invoiceNoIdx !== -1 ? data[i][invoiceNoIdx] : '',
        MAC_ID: macIdx !== -1 ? data[i][macIdx] : '',
        IP_Address: ipIdx !== -1 ? data[i][ipIdx] : ''
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
          if (!asset.Location) {
            asset.Location = compData[i][compHeaders.indexOf('Location')];
          }
          break;
        }
      }
    }
  }

  return {
    assetId: asset.Asset_Ref,
    companyName: asset.CompanyName || 'N/A',
    location: asset.Location || 'N/A',
    subLocation: asset.Sub_Location || 'N/A',
    floor: asset.Floor || 'N/A',
    roomType: asset.Asset_Type || 'N/A',
    roomName: asset.Room_Name || 'N/A',
    productMake: asset.Make,
    productModel: asset.Model,
    productSerial: asset.Serial_Number,
    supportType: supportType,
    isExpired: isExpired,
    warrantyEndDate: asset.Warranty_End,
    warrantyStartDate: asset.Warranty_Start,
    dlpPeriod: asset.DLP_Period,
    warrantyDaysLeft: asset.Days_Left,
    assetStatus: asset.Asset_Status,
    salesOrder: asset.Sales_Order || 'N/A',
    invoiceNo: asset.Invoice_No || 'N/A',
    macId: asset.MAC_ID || 'N/A',
    ipAddress: asset.IP_Address || 'N/A'
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
    payload.salesOrder || '',             
    payload.invoiceNo || '',              
    payload.refCode || '',                
    payload.companyName || '',            
    payload.location || '',               
    payload.subLocation || '',            
    payload.roomType || '',               
    payload.floor || '',                  
    payload.roomName || '',               
    payload.productMake || '',            
    payload.productModel || '',           
    payload.productSerial || '',          
    payload.macId || '',                  
    payload.ipAddress || '',              
    payload.warrantyStartDate || '',      
    payload.dlpPeriod || '',              
    payload.warrantyEndDate || '',        
    payload.warrantyDaysLeft || '',       
    payload.assetStatus || 'Active',      
    new Date(),                           
    new Date()                            
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
    if (data[i][0] === payload.id || data[i][0] === payload.uniqueProductId) {
      sheet.getRange(i + 1, 2).setValue(payload.salesOrder || '');
      sheet.getRange(i + 1, 3).setValue(payload.invoiceNo || '');
      sheet.getRange(i + 1, 4).setValue(payload.refCode || '');
      sheet.getRange(i + 1, 5).setValue(payload.companyName || '');
      sheet.getRange(i + 1, 6).setValue(payload.location || '');
      sheet.getRange(i + 1, 7).setValue(payload.subLocation || '');
      sheet.getRange(i + 1, 8).setValue(payload.roomType || '');
      sheet.getRange(i + 1, 9).setValue(payload.floor || '');
      sheet.getRange(i + 1, 10).setValue(payload.roomName || '');
      sheet.getRange(i + 1, 11).setValue(payload.productMake || '');
      sheet.getRange(i + 1, 12).setValue(payload.productModel || '');
      sheet.getRange(i + 1, 13).setValue(payload.productSerial || '');
      sheet.getRange(i + 1, 14).setValue(payload.macId || '');
      sheet.getRange(i + 1, 15).setValue(payload.ipAddress || '');
      sheet.getRange(i + 1, 16).setValue(payload.warrantyStartDate || '');
      sheet.getRange(i + 1, 17).setValue(payload.dlpPeriod || '');
      sheet.getRange(i + 1, 18).setValue(payload.warrantyEndDate || '');
      sheet.getRange(i + 1, 19).setValue(payload.warrantyDaysLeft || '');
      sheet.getRange(i + 1, 20).setValue(payload.assetStatus || 'Active');
      sheet.getRange(i + 1, 22).setValue(new Date());
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
  
  logSystemActivity(payload.actorEmail || 'SYSTEM', "TASK_ASSIGNED", taskId, `Task assigned to ${payload.engName} (${payload.engEmail})`);
  
  return { success: true };
}

/**
 * Append parent administrative remark
 */
function handleParentRemarkRequest(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('System_Logs');
  const ticketSheet = ss.getSheetByName('Master_Tickets');
  
  if (logSheet) {
    const logId = "LOG-" + Utilities.getUuid().slice(-8);
    const timestamp = new Date().toISOString();
    const logRow = [
      logId,                       // 1. Log_ID
      timestamp,                   // 2. Timestamp
      payload.actorEmail || "",     // 3. Actor_Email
      "Admin Remark",              // 4. Action_Type
      payload.parentId || "",      // 5. Target_ID
      payload.remark || ""         // 6. Remarks
    ];
    logSheet.appendRow(logRow);
  }
  
  if (ticketSheet) {
    const data = ticketSheet.getDataRange().getValues();
    const headers = getHeaders(ticketSheet);
    const idIdx = headers.indexOf('Ticket_ID');
    const remarksIdx = headers.indexOf('Admin_Remarks');
    
    if (idIdx !== -1 && remarksIdx !== -1) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(payload.parentId).trim()) {
          const currentRemarks = data[i][remarksIdx] || "";
          const timestamp = new Date().toISOString();
          const newRemark = `[${timestamp} - Admin] ${payload.remark}`;
          const updatedRemarks = currentRemarks ? currentRemarks + "\n" + newRemark : newRemark;
          ticketSheet.getRange(i + 1, remarksIdx + 1).setValue(updatedRemarks);
          break;
        }
      }
    }
  }
  return { success: true };
}

/**
 * Update child engineer subtasks
 */
function handleChildUpdateRequest(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  if (!taskSheet) throw new Error("Engineer_Tasks sheet missing.");

  const data = taskSheet.getDataRange().getValues();
  if (data.length < 2) throw new Error("No tasks found in database.");

  const headers = data[0].map(h => String(h).trim());
  const taskIdColIdx = headers.indexOf('Task_ID');
  
  // AGGRESSIVE COLUMN MATCHING: Check every known variation of the header names
  const remarksColIdx = headers.findIndex(h => ['Engineer_Remarks', 'Remarks', 'engineerRemarks', 'Admin_Eng_Remarks', 'Admin_Remarks'].includes(h));
  const statusColIdx = headers.findIndex(h => ['Status', 'status', 'Task_Status'].includes(h));

  if (taskIdColIdx === -1) throw new Error("Task_ID column missing in Engineer_Tasks.");

  // Target extraction
  const targetTaskId = String(payload.childId || payload.taskId || payload.Task_ID).trim();
  let rowFound = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][taskIdColIdx]).trim() === targetTaskId) {
      rowFound = i + 1; // +1 for 1-based indexing in Apps Script
      break;
    }
  }

  if (rowFound === -1) throw new Error("Task ID " + targetTaskId + " not found in database.");

  // 1. UPDATE STATUS
  const statusValue = payload.status || payload.Status;
  if (statusColIdx !== -1 && statusValue) {
    taskSheet.getRange(rowFound, statusColIdx + 1).setValue(statusValue);
  }

  // 2. CUMULATIVE REMARKS UPDATE
  const remarksValue = payload.remarks || payload.remark || payload.Remarks;
  if (remarksColIdx !== -1 && remarksValue && remarksValue.trim() !== "") {
    const cell = taskSheet.getRange(rowFound, remarksColIdx + 1);
    const existingRemarks = cell.getValue() || "";
    
    // Generate clean timestamp
    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Asia/Kolkata', 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    
    const newEntry = `[${timestamp}] ${remarksValue.trim()}`;
    const updatedRemarks = existingRemarks ? `${existingRemarks}\n${newEntry}` : newEntry;
    
    cell.setValue(updatedRemarks);
  } else if (remarksColIdx === -1) {
    // If it STILL can't find the column, log a critical warning so we can see it
    Logger.log("CRITICAL: Could not find any Remarks column in Engineer_Tasks. Headers found: " + headers.join(", "));
  }

  logSystemActivity(payload.actorEmail || payload.Engineer_Email || 'SYSTEM', "TASK_UPDATE_" + statusValue, targetTaskId, remarksValue || '');
  evaluateAndEnforceParentStatus(payload.parentId || payload.Ticket_ID_Ref);
  return { success: true };
}

/**
 * Automatically update parent ticket status to Ready to Close
 */
function evaluateAndEnforceParentStatus(parentId) {
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  if (!taskSheet) return;
  const data = taskSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const ticketRefIdx = headers.findIndex(h => ['Ticket_ID_Ref', 'TicketIDRef', 'ticket_id_ref', 'Parent_Ticket_ID'].includes(h));
  const statusIdx = headers.findIndex(h => ['Status', 'status', 'Task_Status'].includes(h));

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

  if (hasTasks) {
    const pSheet = ss.getSheetByName('Master_Tickets');
    if (pSheet) {
      const pData = pSheet.getDataRange().getValues();
      const pHeaders = getHeaders(pSheet);
      const pStatusIdx = pHeaders.indexOf('Status');
      const pIdIdx = pHeaders.indexOf('Ticket_ID');
      if (pStatusIdx !== -1 && pIdIdx !== -1) {
        for (let i = 1; i < pData.length; i++) {
          if (String(pData[i][pIdIdx]).trim() === String(parentId).trim()) {
            const rowIndex = i + 1;
            if (allClosed) {
              pSheet.getRange(rowIndex, pStatusIdx + 1).setValue("Ready to Close");
            } else {
              const currentParentStatus = String(pData[i][pStatusIdx] || "").trim();
              if (currentParentStatus === "Open" || currentParentStatus === "Ready to Close" || currentParentStatus === "") {
                pSheet.getRange(rowIndex, pStatusIdx + 1).setValue("In Progress");
              }
            }
            break;
          }
        }
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
  const pHeaders = getHeaders(pSheet);
  const idIdx = pHeaders.indexOf('Ticket_ID');
  const statusIdx = pHeaders.indexOf('Status');
  const closeDateIdx = pHeaders.indexOf('Close_Date');
  const openDateIdx = pHeaders.indexOf('Open_Date');
  const resolvedDaysIdx = pHeaders.indexOf('Resolved_Days');
  
  if (idIdx === -1 || statusIdx === -1) {
    throw new Error("Invalid Master_Tickets schema.");
  }
  
  for (let i = 1; i < pData.length; i++) {
    if (String(pData[i][idIdx]).trim() === String(parentId).trim()) {
      const rowNum = i + 1;
      pSheet.getRange(rowNum, statusIdx + 1).setValue("Closed");
      
      const closeDate = new Date();
      if (closeDateIdx !== -1) {
        pSheet.getRange(rowNum, closeDateIdx + 1).setValue(closeDate.toISOString());
      }
      
      if (openDateIdx !== -1 && resolvedDaysIdx !== -1) {
        const openDateVal = pData[i][openDateIdx];
        if (openDateVal) {
          const oDate = new Date(openDateVal);
          const timeDiff = Math.abs(closeDate.getTime() - oDate.getTime());
          const diffDays = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
          pSheet.getRange(rowNum, resolvedDaysIdx + 1).setValue(diffDays);
        }
      }
      
      logSystemAction("SYSTEM", `Master ticket ${parentId} closed by admin`);
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
  // 1. Aggressive extraction and normalization
  const rawSearch = payload.trackingQuery || payload.trackingId || payload.searchQuery || payload.id || '';
  const searchId = String(rawSearch).trim().toLowerCase();
  
  if (!searchId) {
    throw new Error("Search query cannot be empty.");
  }

  const ticketSheet = ss.getSheetByName('Master_Tickets');
  const tickets = mapRowsToObjects(ticketSheet);

  // 2. Case-insensitive search across Master_Tickets
  const matchedTickets = tickets.filter(t => {
    const tId = String(t.Ticket_ID || '').trim().toLowerCase();
    const intakeId = String(t.Intake_ID_Ref || t.Intake_ID || '').trim().toLowerCase();
    const refCode = String(t.Ref_Code || '').trim().toLowerCase();
    
    return tId === searchId || intakeId === searchId || refCode === searchId;
  });

  if (matchedTickets.length > 0) {
    // Gather related relations (Tasks & Logs)
    const tasksSheet = ss.getSheetByName('Engineer_Tasks');
    const logsSheet = ss.getSheetByName('System_Logs');
    
    const tasks = tasksSheet ? mapRowsToObjects(tasksSheet).filter(tsk => 
      matchedTickets.some(mt => String(mt.Ticket_ID) === String(tsk.Ticket_ID_Ref))
    ) : [];
    
    const logs = logsSheet ? mapRowsToObjects(logsSheet).filter(l => 
      matchedTickets.some(mt => String(mt.Ticket_ID) === String(l.Target_ID)) || 
      tasks.some(tsk => String(tsk.Task_ID) === String(l.Target_ID))
    ) : [];

    return { tickets: matchedTickets, tasks: tasks, logs: logs };
  }

  // 3. Fallback search across Intake_Queue (if not yet promoted)
  const queueSheet = ss.getSheetByName('Intake_Queue');
  const queue = mapRowsToObjects(queueSheet);
  
  const matchedQueue = queue.filter(q => {
    const qId = String(q.Intake_ID || '').trim().toLowerCase();
    
    // Intake Queue uses flat JSON payload in V1 legacy rows
    let payloadObj = {};
    try { payloadObj = JSON.parse(q.Payload || q.payload || '{}'); } catch(e){}
    const qRef = String(payloadObj.Ref_Code || payloadObj.refCode || '').trim().toLowerCase();

    return qId === searchId || qRef === searchId;
  });

  if (matchedQueue.length > 0) {
    return {
      tickets: matchedQueue.map(q => {
        let pObj = {};
        try { pObj = JSON.parse(q.Payload || q.payload || '{}'); } catch(e){}
        return {
          Ticket_ID: "Pending Operations Review",
          Intake_ID_Ref: q.Intake_ID,
          Ref_Code: pObj.Ref_Code || pObj.refCode || 'N/A',
          Company_Name: pObj.Company_Name || pObj.companyName || 'Unknown',
          Status: "Received / Triage",
          Open_Date: q.Timestamp
        };
      }),
      tasks: [],
      logs: []
    };
  }

  throw new Error("No active records found matching the query.");
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
  const targetTaskId = String(payload.Task_ID || payload.childId || payload.taskId).trim();
  const ticketIdRef = String(payload.Ticket_ID_Ref || payload.parentId || "").trim();
  const targetStatus = payload.Status || payload.status;
  const targetRemarks = payload.Remarks || payload.remarks || payload.remark;
  const engineerEmail = payload.Engineer_Email || payload.actorEmail || 'SYSTEM';
  
  if (!targetTaskId || !ticketIdRef || !targetStatus) {
    throw new Error("Missing Task_ID, Ticket_ID_Ref, or Status.");
  }

  // Step A: Update Engineer_Tasks
  const taskSheet = ss.getSheetByName('Engineer_Tasks');
  if (!taskSheet) throw new Error("Engineer_Tasks sheet missing.");

  const data = taskSheet.getDataRange().getValues();
  if (data.length < 2) throw new Error("No tasks found in database.");

  const headers = data[0].map(h => String(h).trim());
  const taskIdColIdx = headers.indexOf('Task_ID');
  
  // AGGRESSIVE COLUMN MATCHING
  const remarksColIdx = headers.findIndex(h => ['Engineer_Remarks', 'Remarks', 'engineerRemarks', 'Admin_Eng_Remarks', 'Admin_Remarks'].includes(h));
  const statusColIdx = headers.findIndex(h => ['Status', 'status', 'Task_Status'].includes(h));
  const closeDateColIdx = headers.findIndex(h => ['Closed_Date', 'ClosedDate', 'closed_date', 'Close_Date'].includes(h));

  if (taskIdColIdx === -1) throw new Error("Task_ID column missing in Engineer_Tasks.");

  let rowFound = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][taskIdColIdx]).trim() === targetTaskId) {
      rowFound = i + 1; // +1 for 1-based indexing in Apps Script
      break;
    }
  }

  if (rowFound === -1) throw new Error("Task ID " + targetTaskId + " not found in database.");

  // 1. UPDATE STATUS
  if (statusColIdx !== -1 && targetStatus) {
    taskSheet.getRange(rowFound, statusColIdx + 1).setValue(targetStatus);
  }

  // 2. CUMULATIVE REMARKS UPDATE
  if (remarksColIdx !== -1 && targetRemarks && targetRemarks.trim() !== "") {
    const cell = taskSheet.getRange(rowFound, remarksColIdx + 1);
    const existingRemarks = cell.getValue() || "";
    
    // Generate clean timestamp
    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Asia/Kolkata', 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    
    const newEntry = `[${timestamp}] ${targetRemarks.trim()}`;
    const updatedRemarks = existingRemarks ? `${existingRemarks}\n${newEntry}` : newEntry;
    
    cell.setValue(updatedRemarks);
  } else if (remarksColIdx === -1) {
    Logger.log("CRITICAL: Could not find any Remarks column in Engineer_Tasks. Headers found: " + headers.join(", "));
  }

  // 3. CLOSED DATE UPDATE
  if (targetStatus && (targetStatus.toLowerCase() === 'resolved' || targetStatus.toLowerCase() === 'closed') && closeDateColIdx !== -1) {
    taskSheet.getRange(rowFound, closeDateColIdx + 1).setValue(new Date().toISOString());
  }

  // Step B: Update Master Ticket Status
  let updatedSlaDays = null;
  evaluateAndEnforceParentStatus(ticketIdRef);

  // Step C: Audit Trail
  logSystemActivity(engineerEmail, "STATUS_UPDATE_" + targetStatus, targetTaskId, targetRemarks || '');

  return {
    Task_ID: targetTaskId,
    Ticket_ID_Ref: ticketIdRef,
    Status: targetStatus,
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
function handleGetDashboard(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Sheets mapping
    const masterSheet = ss.getSheetByName("Master_Tickets");
    const taskSheet = ss.getSheetByName("Engineer_Tasks");
    const intakeSheet = ss.getSheetByName("Intake_Queue");
    const userSheet = ss.getSheetByName("System_Users");
    const companySheet = ss.getSheetByName("Company_Master");
    
    // Step 1: Read and parse all Intake Queue items into a lookup map
    const intakeMap = {};
    const rawIntakeObjects = intakeSheet ? mapRowsToObjects(intakeSheet) : [];
    const serviceRequests = groupIntakeQueue(rawIntakeObjects);
    serviceRequests.forEach(reqObj => {
      intakeMap[reqObj.Intake_ID] = reqObj;
    });
    
    // Step 2: Read and map Master_Tickets to the frontend objects
    const rawMasterObjects = masterSheet ? mapRowsToObjects(masterSheet) : [];
    const parents = [];
    
    rawMasterObjects.forEach(row => {
      const intakeId = row.Intake_ID_Ref;
      const intakeItem = intakeMap[intakeId] || {};
      const pData = intakeItem || {};
      
      parents.push({
        Parent_ID: row.Ticket_ID,
        "Parent ID": row.Ticket_ID,
        parentId: row.Ticket_ID,
        Ticket_ID: row.Ticket_ID,
        
        Service_Request_ID: row.Intake_ID_Ref,
        "Service Request ID": row.Intake_ID_Ref,
        serviceRequestId: row.Intake_ID_Ref,
        Intake_ID_Ref: row.Intake_ID_Ref,
        
        Ref_Code: row.Ref_Code,
        refCode: row.Ref_Code,
        
        Company_Name: row.Company_Name,
        "Company Name": row.Company_Name,
        companyName: row.Company_Name,
        
        Location: row.Location,
        location: row.Location,
        
        Service_Type: row.Service_Type,
        serviceType: row.Service_Type,
        
        Status: row.Status,
        status: row.Status,
        
        Assigned_Engineer: row.Assigned_Engineer,
        "Assigned Engineer": row.Assigned_Engineer,
        assignedEngineer: row.Assigned_Engineer,
        
        Open_Date: row.Open_Date,
        openDate: row.Open_Date,
        "Open Date": row.Open_Date,
        
        Close_Date: row.Close_Date,
        closeDate: row.Close_Date,
        "Close Date": row.Close_Date,
        
        Resolved_Days: row.Resolved_Days,
        resolvedDays: row.Resolved_Days,
        "Resolved Days": row.Resolved_Days,
        
        Admin_Remarks: row.Admin_Remarks,
        admin_remarks: row.Admin_Remarks,
        adminRemarks: row.Admin_Remarks,
        
        // Enriched Fields from Intake payload
        Requested_By: pData.reqBy || pData.Requested_By || pData.requesterName || "",
        "Requested By": pData.reqBy || pData.Requested_By || pData.requesterName || "",
        requestedBy: pData.reqBy || pData.Requested_By || pData.requesterName || "",
        
        Client_Email: pData.clientEmail || pData.Client_Email || pData.email || "",
        clientEmail: pData.clientEmail || pData.Client_Email || pData.email || "",
        "Client Email": pData.clientEmail || pData.Client_Email || pData.email || "",
        
        PhoneNumber: pData.phoneNumber || pData.PhoneNumber || pData.phone || "",
        phoneNumber: pData.phoneNumber || pData.PhoneNumber || pData.phone || "",
        "Phone Number": pData.phoneNumber || pData.PhoneNumber || pData.phone || "",
        
        Room_Name: row.Room_Name || pData.roomName || pData.room || pData.Room_Name || "",
        roomName: row.Room_Name || pData.roomName || pData.room || pData.Room_Name || "",
        "Room Name": row.Room_Name || pData.roomName || pData.room || pData.Room_Name || "",
        
        Category: pData.category || pData.Category || "",
        category: pData.category || pData.Category || "",
        
        Issue_Type: pData.issueType || pData.Issue_Type || "",
        issueType: pData.issueType || pData.Issue_Type || "",
        "Issue Type": pData.issueType || pData.Issue_Type || "",
        
        Sales_Order: pData.salesOrder || pData.Sales_Order || "",
        salesOrder: pData.salesOrder || pData.Sales_Order || "",
        "Sales Order": pData.salesOrder || pData.Sales_Order || "",
        
        ProductMake: pData.productMake || pData.brand || pData.ProductMake || "",
        brand: pData.productMake || pData.brand || pData.ProductMake || "",
        Brand: pData.productMake || pData.brand || pData.ProductMake || "",
        
        ProductModel: pData.productModel || pData.model || pData.ProductModel || "",
        model: pData.productModel || pData.model || pData.ProductModel || "",
        Model: pData.productModel || pData.model || pData.ProductModel || "",
        
        ProductSerial: pData.productSerial || pData.serial || pData.ProductSerial || "",
        serial: pData.productSerial || pData.serial || pData.ProductSerial || "",
        Serial: pData.productSerial || pData.serial || pData.ProductSerial || "",
        
        Description: row.Description || pData.description || pData.Description || "",
        description: row.Description || pData.description || pData.Description || ""
      });
    });
    
    // Step 3: Fetch and build User Roles Map
    const userRolesMap = {};
    if (userSheet) {
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = getHeaders(userSheet);
      const emailIdx = userHeaders.indexOf("Email");
      const roleIdx = userHeaders.indexOf("Role");
      if (emailIdx !== -1 && roleIdx !== -1) {
        for (let i = 1; i < userData.length; i++) {
          const email = String(userData[i][emailIdx]).trim().toLowerCase();
          const role = String(userData[i][roleIdx]).trim();
          userRolesMap[email] = role;
        }
      }
    }
    
    // Step 4: Fetch and map Engineer_Tasks (children)
    const rawTaskObjects = taskSheet ? mapRowsToObjects(taskSheet) : [];
    const children = [];
    const taskHeaders = taskSheet ? getHeaders(taskSheet).map(h => String(h).trim()) : [];
    const remarksColIdx = taskHeaders.findIndex(h => ['Engineer_Remarks', 'Remarks', 'engineerRemarks', 'Admin_Eng_Remarks', 'Admin_Remarks'].includes(h));
    const remarksHeaderName = remarksColIdx !== -1 ? taskHeaders[remarksColIdx] : '';

    rawTaskObjects.forEach(row => {
      // Find role of the engineer
      const engEmail = String(row.Engineer_Email || "").trim().toLowerCase();
      const engRole = userRolesMap[engEmail] || "Engineer";
      
      // Determine Acknowledged_At from the record's values
      let acknowledgedAt = "";
      Object.keys(row).forEach(k => {
        const valStr = String(row[k]);
        if (valStr.includes("Acknowledged At:")) {
          const match = valStr.match(/Acknowledged At:\s*([^\n]+)/);
          if (match) {
            acknowledgedAt = match[1].trim();
          }
        }
      });

      const remarksVal = remarksHeaderName ? (row[remarksHeaderName] || "") : "";
      
      children.push({
        Child_ID: row.Task_ID,
        Task_ID: row.Task_ID,
        Ticket_ID_Ref: row.Ticket_ID_Ref,
        Parent_ID: row.Ticket_ID_Ref,
        parentId: row.Ticket_ID_Ref,
        
        Engineer_Name: row.Engineer_Name,
        Engineer_Email: row.Engineer_Email,
        engineerEmail: row.Engineer_Email,
        Engineer_Role: engRole,
        
        Status: row.Status || "Assigned",
        Assigned_Date: row.Assigned_Date || "",
        Closed_Date: row.Closed_Date || "",
        Instructions: row.Instructions || "",
        
        // Expose under all variations to be absolutely safe for the frontend UI
        Engineer_Remarks: remarksVal,
        engineerRemarks: remarksVal,
        Remarks: remarksVal,
        Admin_Eng_Remarks: remarksVal,
        admin_eng_remarks: remarksVal,
        Acknowledged_At: acknowledgedAt
      });
    });
    
    // Step 5: Engineers: Filter System_Users for users with an "Engineer" role
    const engineers = [];
    if (userSheet) {
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = getHeaders(userSheet);
      const nameIdx = userHeaders.indexOf("Name");
      const emailIdx = userHeaders.indexOf("Email");
      const roleIdx = userHeaders.indexOf("Role");
      
      for (let i = 1; i < userData.length; i++) {
        const role = String(userData[i][roleIdx] || "").trim();
        if (role.toLowerCase() === "engineer") {
          engineers.push({
            Name: userData[i][nameIdx],
            Email: userData[i][emailIdx],
            Role: role
          });
        }
      }
    }
    
    // Step 6: Clients: clean array of company names from Company_Master
    const clients = [];
    if (companySheet) {
      const compData = companySheet.getDataRange().getValues();
      const compHeaders = getHeaders(companySheet);
      const nameIdx = compHeaders.indexOf("Company_Name");
      
      for (let i = 1; i < compData.length; i++) {
        const name = String(compData[i][nameIdx] || "").trim();
        if (name && !clients.some(c => c.Company_Name === name)) {
          clients.push({
            Company_Name: name
          });
        }
      }
    }
    // Step 7: System Logs
    const logSheet = ss.getSheetByName("System_Logs");
    const logs = logSheet ? mapRowsToObjects(logSheet) : [];
    
    return jsonResponse({
      parents: parents,
      children: children,
      serviceRequests: serviceRequests,
      clients: clients,
      engineers: engineers,
      logs: logs
    }, true, "Dashboard loaded");
    
  } catch (error) {
    return jsonResponse(null, false, "Dashboard Load Error: " + error.message);
  }
}

/**
 * Handle Ticket Creation & Assignment Workflow
 */
function handleCreateTicket(payload) {
  try {
    const actorEmail = payload.actorEmail || "";
    const ticketData = payload.ticketData;
    
    if (!ticketData) {
      throw new Error("Missing ticketData parameter.");
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ticketSheet = ss.getSheetByName("Master_Tickets");
    if (!ticketSheet) {
      throw new Error("Master_Tickets database configuration is missing.");
    }
    
    // Resolve Ref_Code from Company_Name
    let refCode = "";
    const companySheet = ss.getSheetByName("Company_Master");
    if (companySheet) {
      const compData = companySheet.getDataRange().getValues();
      const compHeaders = getHeaders(companySheet);
      const cRefIdx = compHeaders.indexOf("Ref_Code");
      const cNameIdx = compHeaders.indexOf("Company_Name");
      for (let i = 1; i < compData.length; i++) {
        if (String(compData[i][cNameIdx]).trim().toLowerCase() === String(ticketData.company).trim().toLowerCase()) {
          refCode = compData[i][cRefIdx];
          break;
        }
      }
    }
    
    // Generate sequential ticket ID (e.g. AVD/PT/26-27/001)
    const fy = getIndianFinancialYear(new Date());
    const prefix = "AVD/PT/" + fy + "/";
    const ticketValues = ticketSheet.getDataRange().getValues();
    let maxTicketSeq = 0;
    for (let i = 1; i < ticketValues.length; i++) {
      const id = String(ticketValues[i][0]);
      if (id.startsWith(prefix)) {
        const parts = id.split('/');
        const numPart = parts[parts.length - 1];
        const seq = parseInt(numPart, 10);
        if (!isNaN(seq) && seq > maxTicketSeq) {
          maxTicketSeq = seq;
        }
      }
    }
    const nextTicketSeq = maxTicketSeq + 1;
    const ticketId = prefix + nextTicketSeq.toString().padStart(3, '0');
    
    // Handle Intake Queue promotes or create manual Intake Queue item to store payload fields
    let serviceRequestId = ticketData.serviceRequestId;
    const intakeSheet = ss.getSheetByName("Intake_Queue");
    const intakeHeaders = intakeSheet ? getHeaders(intakeSheet) : [];
    const hasPayload = intakeHeaders.indexOf("Payload") !== -1;
    
    if (!serviceRequestId) {
      // Manual ticket creation. Create an Intake record to store all the payload fields!
      if (intakeSheet) {
        serviceRequestId = generateIntakeId(intakeSheet);
        const timestamp = new Date().toISOString();
        
        if (hasPayload) {
          // Construct clean payload for Intake (legacy format)
          const manualPayload = {
            serviceRequestId: serviceRequestId,
            companyName: ticketData.company || "",
            company: ticketData.company || "",
            clientEmail: ticketData.clientEmail || "",
            email: ticketData.clientEmail || "",
            phoneNumber: ticketData.phoneNumber || "",
            location: ticketData.location || "",
            room: ticketData.room || "",
            roomName: ticketData.room || "",
            reqBy: ticketData.reqBy || "",
            requesterName: ticketData.reqBy || "",
            category: ticketData.category || "",
            issueType: ticketData.issueType || "",
            otherIssue: ticketData.otherIssue || "",
            productMake: ticketData.productMake || "",
            productModel: ticketData.productModel || "",
            productSerial: ticketData.productSerial || "",
            serviceType: ticketData.serviceType || "",
            description: ticketData.description || "",
            salesOrder: ticketData.salesOrder || "",
            instructions: ticketData.instructions || ""
          };
          
          // Append row to Intake_Queue
          intakeSheet.appendRow([
            serviceRequestId,
            "Manual",
            JSON.stringify(manualPayload),
            timestamp,
            "Promoted",
            ticketData.engName || "", // Assigned_To
            "Synced", // Sync_Status
            "" // Request_ID
          ]);
        } else {
          // New structured columns: ['Intake_ID', 'Source', 'Unique_Product_Id', 'Ref_Code', 'Company_Name', 'Requester_Name', 'Client_Email', 'PhoneNumber', 'Issue_Description', 'Status', 'Timestamp']
          intakeSheet.appendRow([
            serviceRequestId,
            "Manual",
            ticketData.productId || ticketData.Unique_Product_Id || "",
            refCode || ticketData.clientId || "",
            ticketData.company || "",
            ticketData.reqBy || "",
            ticketData.clientEmail || "",
            ticketData.phoneNumber || "",
            ticketData.description || "",
            "Promoted",
            timestamp
          ]);
        }
      }
    } else {
      // It is a triaged ticket. Mark the intake queue item as "Promoted" and merge payload edits.
      if (intakeSheet) {
        const intakeData = intakeSheet.getDataRange().getValues();
        const inIdIdx = intakeHeaders.indexOf("Intake_ID");
        const inStatusIdx = intakeHeaders.indexOf("Status");
        const inUniqueIdIdx = intakeHeaders.indexOf("Unique_Product_Id");
        const inSerialIdx = intakeHeaders.indexOf("ProductSerial");
        
        const targetUniqueId = ticketData.productId || ticketData.Unique_Product_Id || ticketData.uniqueId || "";
        const targetSerial = ticketData.productSerial || ticketData.ProductSerial || ticketData.serial || "";
        
        for (let i = 1; i < intakeData.length; i++) {
          const rowIntakeId = String(intakeData[i][inIdIdx]).trim();
          if (rowIntakeId === String(serviceRequestId).trim()) {
            if (targetUniqueId || targetSerial) {
              const rowUniqueId = inUniqueIdIdx !== -1 ? String(intakeData[i][inUniqueIdIdx]).trim() : "";
              const rowSerial = inSerialIdx !== -1 ? String(intakeData[i][inSerialIdx]).trim() : "";
              
              const isMatchUnique = targetUniqueId && rowUniqueId && rowUniqueId === String(targetUniqueId).trim();
              const isMatchSerial = targetSerial && rowSerial && rowSerial === String(targetSerial).trim();
              
              if (!isMatchUnique && !isMatchSerial) {
                continue;
              }
            }
            
            intakeSheet.getRange(i + 1, inStatusIdx + 1).setValue("Promoted");
            
            if (hasPayload) {
              const inPayloadIdx = intakeHeaders.indexOf("Payload");
              try {
                let existingPayload = JSON.parse(intakeData[i][inPayloadIdx] || "{}");
                const updatedPayload = {
                  ...existingPayload,
                  companyName: ticketData.company || existingPayload.companyName || "",
                  company: ticketData.company || existingPayload.company || "",
                  clientEmail: ticketData.clientEmail || existingPayload.clientEmail || "",
                  email: ticketData.clientEmail || existingPayload.email || "",
                  phoneNumber: ticketData.phoneNumber || existingPayload.phoneNumber || "",
                  location: ticketData.location || existingPayload.location || "",
                  room: ticketData.room || existingPayload.room || "",
                  roomName: ticketData.room || existingPayload.roomName || "",
                  reqBy: ticketData.reqBy || existingPayload.reqBy || "",
                  requesterName: ticketData.reqBy || existingPayload.requesterName || "",
                  category: ticketData.category || existingPayload.category || "",
                  issueType: ticketData.issueType || existingPayload.issueType || "",
                  otherIssue: ticketData.otherIssue || existingPayload.otherIssue || "",
                  productMake: ticketData.productMake || existingPayload.productMake || "",
                  productModel: ticketData.productModel || existingPayload.productModel || "",
                  productSerial: ticketData.productSerial || existingPayload.productSerial || "",
                  serviceType: ticketData.serviceType || existingPayload.serviceType || "",
                  description: ticketData.description || existingPayload.description || "",
                  salesOrder: ticketData.salesOrder || existingPayload.salesOrder || "",
                  instructions: ticketData.instructions || existingPayload.instructions || ""
                };
                intakeSheet.getRange(i + 1, inPayloadIdx + 1).setValue(JSON.stringify(updatedPayload));
              } catch (e) {
                Logger.log("Error merging payload in createTicket: " + e.message);
              }
            } else {
              const inDescIdx = intakeHeaders.indexOf("Issue_Description");
              const inReqIdx = intakeHeaders.indexOf("Requester_Name");
              const inEmailIdx = intakeHeaders.indexOf("Client_Email");
              const inPhoneIdx = intakeHeaders.indexOf("PhoneNumber");
              
              if (inDescIdx !== -1 && ticketData.description) intakeSheet.getRange(i + 1, inDescIdx + 1).setValue(ticketData.description);
              if (inReqIdx !== -1 && ticketData.reqBy) intakeSheet.getRange(i + 1, inReqIdx + 1).setValue(ticketData.reqBy);
              if (inEmailIdx !== -1 && ticketData.clientEmail) intakeSheet.getRange(i + 1, inEmailIdx + 1).setValue(ticketData.clientEmail);
              if (inPhoneIdx !== -1 && ticketData.phoneNumber) intakeSheet.getRange(i + 1, inPhoneIdx + 1).setValue(ticketData.phoneNumber);
            }
            break;
          }
        }
      }
    }
    
    // Status Logic
    const status = ticketData.engEmail ? "In Progress" : "Open";
    const openDate = new Date().toISOString();
    
    // Append row to Master_Tickets
    // Schema: ['Ticket_ID', 'Intake_ID_Ref', 'Ref_Code', 'Company_Name', 'Requester_Name', 'Client_Email', 'PhoneNumber', 'Location', 'Sub_Location', 'Room_Name', 'ProductMake', 'ProductModel', 'ProductSerial', 'MAC_ID', 'IP_Address', 'Sales_Order', 'Warranty_End_Date', 'Category', 'Attachment_URL', 'Service_Type', 'Status', 'Assigned_Engineer', 'Open_Date', 'Close_Date', 'Resolved_Days', 'Admin_Remarks']
    ticketSheet.appendRow([
      ticketId,
      serviceRequestId || "",
      refCode || ticketData.clientId || "",
      ticketData.company || "",
      payload.Requester_Name || ticketData.Requester_Name || ticketData.requesterName || ticketData.reqBy || "",
      payload.Client_Email || ticketData.Client_Email || ticketData.clientEmail || ticketData.email || "",
      payload.PhoneNumber || ticketData.PhoneNumber || ticketData.phoneNumber || ticketData.phone || "",
      ticketData.location || "",
      ticketData.subLocation || ticketData.Sub_Location || "",
      ticketData.room || ticketData.Room_Name || "",
      ticketData.productMake || ticketData.ProductMake || "",
      ticketData.productModel || ticketData.ProductModel || "",
      ticketData.productSerial || ticketData.ProductSerial || "",
      ticketData.macId || ticketData.MAC_ID || "",
      ticketData.ipAddress || ticketData.IP_Address || "",
      payload.Sales_Order || ticketData.Sales_Order || ticketData.salesOrder || "",
      ticketData.warrantyEndDate || ticketData.Warranty_End_Date || "",
      ticketData.category || ticketData.Category || "",
      ticketData.attachmentUrl || ticketData.Attachment_URL || "",
      ticketData.serviceType || "Standard",
      status,
      ticketData.engName || "",
      openDate,
      "", // Close_Date
      "", // Resolved_Days
      ticketData.description || "" // Admin_Remarks
    ]);
    
    // Deploy Engineer Task if engEmail exists
    let taskId = "";
    if (ticketData.engEmail) {
      const taskSheet = ss.getSheetByName("Engineer_Tasks");
      if (taskSheet) {
        const taskValues = taskSheet.getDataRange().getValues();
        let maxTaskSeq = 0;
        for (let i = 1; i < taskValues.length; i++) {
          const id = String(taskValues[i][0]);
          if (id.startsWith("TSK-")) {
            const numPart = id.substring(4);
            const seq = parseInt(numPart, 10);
            if (!isNaN(seq) && seq > maxTaskSeq) {
              maxTaskSeq = seq;
            }
          }
        }
        const nextTaskSeq = maxTaskSeq + 1;
        taskId = "TSK-" + nextTaskSeq.toString().padStart(4, '0');
        
        // Headers: ['Task_ID', 'Ticket_ID_Ref', 'Engineer_Name', 'Engineer_Email', 'Status', 'Assigned_Date', 'Closed_Date', 'Admin_Instructions', 'Engineer_Remarks']
        taskSheet.appendRow([
          taskId,
          ticketId,
          ticketData.engName || "",
          ticketData.engEmail,
          "Assigned",
          new Date().toISOString(),
          "", // Closed_Date
          ticketData.instructions || "",
          ""  // Engineer_Remarks
        ]);
      }
    }
    
    logSystemActivity(
      actorEmail, 
      "CREATE_TICKET", 
      ticketId, 
      "Created ticket " + ticketId + (taskId ? " and assigned engineer task " + taskId : "")
    );
    
    return jsonResponse({ newTicketId: ticketId }, true, "Ticket successfully created");
    
  } catch (error) {
    return jsonResponse(null, false, "Ticket Creation Failed: " + error.message);
  }
}

/**
 * Create Master Ticket directly (Admin manual flow bypassing Intake Queue)
 */
function handleCreateMasterTicket(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ticketSheet = ss.getSheetByName("Master_Tickets");
    const taskSheet = ss.getSheetByName("Engineer_Tasks");

    if (!ticketSheet) {
      throw new Error("Master_Tickets sheet missing.");
    }

    const { ticketData, engineer } = payload;
    if (!ticketData) {
      throw new Error("Missing ticketData in payload.");
    }

    // Generate ticket ID
    const ticketId = "AVD/PT/" + Date.now().toString().slice(-4);

    // Resolve refCode from company if not provided
    let refCode = ticketData.Ref_Code || "";
    if (!refCode && ticketData.Company_Name) {
      const companySheet = ss.getSheetByName("Company_Master");
      if (companySheet) {
        const compData = companySheet.getDataRange().getValues();
        const compHeaders = getHeaders(companySheet);
        const cRefIdx = compHeaders.indexOf("Ref_Code");
        const cNameIdx = compHeaders.indexOf("Company_Name");
        for (let i = 1; i < compData.length; i++) {
          if (String(compData[i][cNameIdx]).trim().toLowerCase() === String(ticketData.Company_Name).trim().toLowerCase()) {
            refCode = compData[i][cRefIdx];
            break;
          }
        }
      }
    }
    ticketData.Ref_Code = ticketData.Ref_Code || refCode || "";

    const hasEngineer = engineer && engineer.email;
    const status = hasEngineer ? "In Progress" : "Open";
    const assignedEngName = hasEngineer ? (engineer.name || "") : "";

    const tData = ticketData || payload.ticketData || payload; // Failsafe extraction

    const newMasterRow = [
      ticketId,                               // 1. Ticket_ID
      tData.Intake_ID_Ref || tData.Intake_ID || "MANUAL_ENTRY", // 2. Intake_ID_Ref
      tData.Ref_Code || "",                   // 3. Ref_Code
      tData.Company_Name || "",               // 4. Company_Name
      tData.Requester_Name || "",             // 5. Requester_Name
      tData.Client_Email || "",               // 6. Client_Email
      tData.PhoneNumber || "",                // 7. PhoneNumber
      tData.Location || "",                   // 8. Location
      tData.Sub_Location || "",               // 9. Sub_Location
      tData.Room_Name || "",                  // 10. Room_Name
      tData.ProductMake || "",                // 11. ProductMake
      tData.ProductModel || "",               // 12. ProductModel
      tData.ProductSerial || "",              // 13. ProductSerial
      tData.MAC_ID || "",                     // 14. MAC_ID
      tData.IP_Address || "",                 // 15. IP_Address
      tData.Sales_Order || "",                // 16. Sales_Order
      tData.Warranty_End_Date || "",          // 17. Warranty_End_Date
      tData.Category || "",                  // 18. Category
      tData.Attachment_URL || "",            // 19. Attachment_URL
      tData.Service_Type || "General",       // 20. Service_Type
      hasEngineer ? "In Progress" : "Open",   // 21. Status
      assignedEngName || "",                  // 22. Assigned_Engineer
      new Date().toISOString(),               // 23. Open_Date
      "",                                     // 24. Close_Date
      "",                                     // 25. Resolved_Days
      tData.Admin_Remarks || "",              // 26. Admin_Remarks
      tData.Unique_Product_Id || "",          // 27. Unique_Product_Id
      tData.Floor || "",                      // 28. Floor
      tData.Room_Type || "",                  // 29. Room_Type
      tData.Warranty_Start_Date || "",        // 30. Warranty_Start_Date
      tData.DLP_Period || "",                 // 31. DLP_Period
      tData.Warranty_Days_Left || "",         // 32. Warranty_Days_Left
      tData.Asset_Status || "Active",         // 33. Asset_Status
      tData.Issue_Type || tData.issueType || "" // 34. Issue_Type
    ];

    // DIAGNOSTIC LOGGERS - Check your Apps Script Executions tab to see these
    Logger.log("REACT PAYLOAD RECEIVED: " + JSON.stringify(tData));
    Logger.log("SHEET INSERTION ARRAY: " + JSON.stringify(newMasterRow));

    ticketSheet.appendRow(newMasterRow);

    let taskId = "";
    if (hasEngineer && taskSheet) {
      taskId = "TSK-" + Math.floor(1000 + Math.random() * 9000);
      
      // Schema: ['Task_ID', 'Ticket_ID_Ref', 'Engineer_Name', 'Engineer_Email', 'Status', 'Assigned_Date', 'Closed_Date', 'Admin_Instructions', 'Engineer_Remarks']
      const taskRow = [
        taskId,
        ticketId,
        engineer.name || "",
        engineer.email,
        "Assigned",
        new Date().toISOString(), // Assigned_Date
        "", // Closed_Date
        engineer.instructions || "",
        "" // Engineer_Remarks
      ];
      taskSheet.appendRow(taskRow);
    }

    logSystemActivity(
      payload.actorEmail || "ADMIN",
      "CREATE_TICKET_DIRECT",
      ticketId,
      "Created direct ticket " + ticketId + (taskId ? " with task " + taskId : "")
    );

    return jsonResponse({ newTicketId: ticketId }, true, "Master Ticket created successfully");

  } catch (error) {
    return jsonResponse(null, false, "Direct Master Ticket Creation Failed: " + error.message);
  }
}

/**
 * 11. Search Ticket by ID, Phone Number, Company, or Email
 */
function handleSearchTicket(payload) {
  const searchTerm = String(payload.searchTerm || "").trim();
  if (!searchTerm) {
    throw new Error("Search term is required.");
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ticketSheet = ss.getSheetByName("Master_Tickets");
  const intakeSheet = ss.getSheetByName("Intake_Queue");
  
  if (!ticketSheet || !intakeSheet) {
    throw new Error("Database configuration error.");
  }
  
  const ticketData = ticketSheet.getDataRange().getValues();
  const ticketHeaders = getHeaders(ticketSheet);
  
  const ticketIdIdx = ticketHeaders.indexOf("Ticket_ID");
  const intakeIdRefIdx = ticketHeaders.indexOf("Intake_ID_Ref");
  const refCodeIdx = ticketHeaders.indexOf("Ref_Code");
  const companyNameIdx = ticketHeaders.indexOf("Company_Name");
  const openDateIdx = ticketHeaders.indexOf("Open_Date");
  const statusIdx = ticketHeaders.indexOf("Status");
  const engineerIdx = ticketHeaders.indexOf("Assigned_Engineer");
  const remarksIdx = ticketHeaders.indexOf("Admin_Remarks");
  
  // Try searching Master_Tickets first by ID, Ref Code, or Company Name
  for (let i = 1; i < ticketData.length; i++) {
    const row = ticketData[i];
    const ticketId = String(row[ticketIdIdx] || "").trim();
    const intakeIdRef = String(row[intakeIdRefIdx] || "").trim();
    const refCode = String(row[refCodeIdx] || "").trim();
    const companyName = String(row[companyNameIdx] || "").trim();
    
    if (
      ticketId.toLowerCase() === searchTerm.toLowerCase() ||
      intakeIdRef.toLowerCase() === searchTerm.toLowerCase() ||
      refCode.toLowerCase() === searchTerm.toLowerCase() ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      const ticketObj = {};
      ticketHeaders.forEach((h, idx) => {
        ticketObj[h] = row[idx];
      });
      
      // Enrich with contact details from Intake_Queue if possible
      if (intakeIdRef) {
        const intakeData = intakeSheet.getDataRange().getValues();
        const intakeHeaders = getHeaders(intakeSheet);
        const inIdIdx = intakeHeaders.indexOf("Intake_ID");
        const inPayloadIdx = intakeHeaders.indexOf("Payload");
        for (let j = 1; j < intakeData.length; j++) {
          if (String(intakeData[j][inIdIdx]).trim() === intakeIdRef) {
            if (inPayloadIdx !== -1) {
              try {
                const p = JSON.parse(intakeData[j][inPayloadIdx] || "{}");
                ticketObj.PhoneNumber = p.PhoneNumber || p.phone || "";
                ticketObj.Client_Email = p.Client_Email || p.email || "";
                ticketObj.Requester_Name = p.Requester_Name || p.name || "";
                ticketObj.Issue_Description = p.Issue_Description || p.issue || "";
              } catch (e) {}
            } else {
              const phoneIdx = intakeHeaders.indexOf("PhoneNumber");
              const emailIdx = intakeHeaders.indexOf("Client_Email");
              const reqIdx = intakeHeaders.indexOf("Requester_Name");
              const descIdx = intakeHeaders.indexOf("Issue_Description");
              
              ticketObj.PhoneNumber = phoneIdx !== -1 ? intakeData[j][phoneIdx] : "";
              ticketObj.Client_Email = emailIdx !== -1 ? intakeData[j][emailIdx] : "";
              ticketObj.Requester_Name = reqIdx !== -1 ? intakeData[j][reqIdx] : "";
              ticketObj.Issue_Description = descIdx !== -1 ? intakeData[j][descIdx] : "";
            }
            break;
          }
        }
      }
      return { success: true, ticket: ticketObj };
    }
  }
  
  // If not found in Master_Tickets, search in Intake_Queue (by Intake_ID, or phone, email inside Payload)
  const intakeData = intakeSheet.getDataRange().getValues();
  const intakeHeaders = getHeaders(intakeSheet);
  const inIdIdx = intakeHeaders.indexOf("Intake_ID");
  const inPayloadIdx = intakeHeaders.indexOf("Payload");
  const inStatusIdx = intakeHeaders.indexOf("Status");
  const inTimestampIdx = intakeHeaders.indexOf("Timestamp") !== -1 ? intakeHeaders.indexOf("Timestamp") : intakeHeaders.indexOf("Timestamp_Date");
  
  const inPhoneIdx = intakeHeaders.indexOf("PhoneNumber");
  const inEmailIdx = intakeHeaders.indexOf("Client_Email");
  const inReqIdx = intakeHeaders.indexOf("Requester_Name");
  const inDescIdx = intakeHeaders.indexOf("Issue_Description");
  const inRefIdx = intakeHeaders.indexOf("Ref_Code");
  
  for (let i = 1; i < intakeData.length; i++) {
    const row = intakeData[i];
    const intakeId = String(row[inIdIdx] || "").trim();
    
    let requesterName = "";
    let clientEmail = "";
    let phoneNumber = "";
    let refCode = "";
    let issueDescription = "";
    let companyName = "Verified Client";
    
    if (inPayloadIdx !== -1) {
      let payloadObj = {};
      try {
        payloadObj = JSON.parse(row[inPayloadIdx] || "{}");
      } catch(e) {}
      requesterName = String(payloadObj.Requester_Name || payloadObj.name || "").trim();
      clientEmail = String(payloadObj.Client_Email || payloadObj.email || "").trim();
      phoneNumber = String(payloadObj.PhoneNumber || payloadObj.phone || "").trim();
      refCode = String(payloadObj.Ref_Code || payloadObj.refCode || "").trim();
      issueDescription = String(payloadObj.Issue_Description || payloadObj.issue || "").trim();
      companyName = payloadObj.Company_Name || "Verified Client";
    } else {
      requesterName = inReqIdx !== -1 ? String(row[inReqIdx] || "").trim() : "";
      clientEmail = inEmailIdx !== -1 ? String(row[inEmailIdx] || "").trim() : "";
      phoneNumber = inPhoneIdx !== -1 ? String(row[inPhoneIdx] || "").trim() : "";
      refCode = inRefIdx !== -1 ? String(row[inRefIdx] || "").trim() : "";
      issueDescription = inDescIdx !== -1 ? String(row[inDescIdx] || "").trim() : "";
      companyName = inRefIdx !== -1 ? String(row[intakeHeaders.indexOf("Company_Name")] || "Verified Client").trim() : "Verified Client";
    }
    
    if (
      intakeId.toLowerCase() === searchTerm.toLowerCase() ||
      phoneNumber.toLowerCase() === searchTerm.toLowerCase() ||
      clientEmail.toLowerCase() === searchTerm.toLowerCase() ||
      refCode.toLowerCase() === searchTerm.toLowerCase() ||
      requesterName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      // If the intake is promoted, check if we can find its master ticket
      const isPromoted = String(row[inStatusIdx]).trim().toLowerCase() === "promoted";
      if (isPromoted) {
        for (let j = 1; j < ticketData.length; j++) {
          if (String(ticketData[j][intakeIdRefIdx]).trim() === intakeId) {
            const ticketObj = {};
            ticketHeaders.forEach((h, idx) => {
              ticketObj[h] = ticketData[j][idx];
            });
            ticketObj.PhoneNumber = phoneNumber;
            ticketObj.Client_Email = clientEmail;
            ticketObj.Requester_Name = requesterName;
            ticketObj.Issue_Description = issueDescription;
            return { success: true, ticket: ticketObj };
          }
        }
      }
      
      // If not promoted or master ticket not found, return as pending intake ticket
      const intakeTicket = {
        Ticket_ID: "Pending Assignment",
        Intake_ID_Ref: intakeId,
        Ref_Code: refCode,
        Company_Name: companyName,
        Status: row[inStatusIdx] || "Received",
        Open_Date: row[inTimestampIdx],
        Admin_Remarks: "Awaiting promotion to Master Operations Board.",
        PhoneNumber: phoneNumber,
        Client_Email: clientEmail,
        Requester_Name: requesterName,
        Issue_Description: issueDescription
      };
      return { success: true, ticket: intakeTicket };
    }
  }
  
  return { success: false, message: "No active ticket or intake record found matching the search criteria." };
}


/**
 * HTML-to-PDF Service Report Generator
 */
function handleGenerateServiceReport(payload) {
  const ticketId = payload.Ticket_ID || payload.ticketId;
  if (!ticketId) {
    throw new Error("Missing Ticket_ID parameter.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ticketSheet = ss.getSheetByName("Master_Tickets");
  if (!ticketSheet) {
    throw new Error("Master_Tickets sheet is missing.");
  }

  const ticketData = ticketSheet.getDataRange().getValues();
  const ticketHeaders = getHeaders(ticketSheet);
  const tIdIdx = ticketHeaders.indexOf("Ticket_ID");

  let ticketRow = null;
  for (let i = 1; i < ticketData.length; i++) {
    if (String(ticketData[i][tIdIdx]).trim() === String(ticketId).trim()) {
      ticketRow = {};
      ticketHeaders.forEach((h, idx) => {
        ticketRow[h] = ticketData[i][idx];
      });
      break;
    }
  }

  if (!ticketRow) {
    throw new Error("Ticket ID not found: " + ticketId);
  }

  // Look up Engineer Remarks in Engineer_Tasks
  let engineerName = ticketRow.Assigned_Engineer || "Not Assigned";
  let engineerRemarks = "No remarks logged by engineer.";
  
  const taskSheet = ss.getSheetByName("Engineer_Tasks");
  if (taskSheet) {
    const taskData = taskSheet.getDataRange().getValues();
    const taskHeaders = getHeaders(taskSheet);
    const refIdx = taskHeaders.indexOf("Ticket_ID_Ref");
    const nameIdx = taskHeaders.indexOf("Engineer_Name");
    const remarksIdx = taskHeaders.indexOf("Engineer_Remarks");

    // Gather remarks from all tasks linked to this ticket
    const remarksList = [];
    for (let i = 1; i < taskData.length; i++) {
      if (String(taskData[i][refIdx]).trim() === String(ticketId).trim()) {
        const eng = String(taskData[i][nameIdx] || "").trim();
        const rem = String(taskData[i][remarksIdx] || "").trim();
        if (eng) engineerName = eng;
        if (rem) {
          remarksList.push(`[${eng}]: ${rem}`);
        }
      }
    }
    if (remarksList.length > 0) {
      engineerRemarks = remarksList.join("\n");
    }
  }

  // Format Dates
  const openDateStr = ticketRow.Open_Date ? new Date(ticketRow.Open_Date).toLocaleString() : "N/A";
  const closeDateStr = ticketRow.Close_Date ? new Date(ticketRow.Close_Date).toLocaleString() : "Awaiting Close";
  const slaDays = ticketRow.Resolved_Days !== undefined && ticketRow.Resolved_Days !== "" ? `${ticketRow.Resolved_Days} Days` : "In Progress";

  // Build HTML template with clean inline styling
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Service Report - ${ticketId}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #334155; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo-title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
        .report-label { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .card { background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .card h3 { margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
        .field { margin-bottom: 8px; font-size: 13px; }
        .field-label { font-weight: bold; color: #475569; width: 140px; display: inline-block; }
        .field-value { color: #0f172a; }
        .section-title { font-size: 15px; text-transform: uppercase; color: #1e3a8a; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #1e3a8a; padding-bottom: 4px; }
        .description-box { background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; font-size: 13px; min-height: 80px; white-space: pre-wrap; }
        .footer { margin-top: 50px; font-size: 11px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-title">AV DYNAMIC PROSUPPORT</div>
        <div class="report-label">Service Incident Report</div>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="margin: 0 0 5px 0; color: #0f172a; font-size: 20px;">Ticket Reference: ${ticketId}</h2>
        <span style="font-size: 12px; color: #64748b;">Generated on ${new Date().toLocaleString()}</span>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Ticket Metadata</h3>
          <div class="field"><span class="field-label">Intake Reference:</span><span class="field-value">${ticketRow.Intake_ID_Ref || "N/A"}</span></div>
          <div class="field"><span class="field-label">Reference Code:</span><span class="field-value">${ticketRow.Ref_Code || "N/A"}</span></div>
          <div class="field"><span class="field-label">Service Type:</span><span class="field-value">${ticketRow.Service_Type || "Standard"}</span></div>
          <div class="field"><span class="field-label">Open Date:</span><span class="field-value">${openDateStr}</span></div>
          <div class="field"><span class="field-label">Close Date:</span><span class="field-value">${closeDateStr}</span></div>
          <div class="field"><span class="field-label">Total Resolution SLA:</span><span class="field-value">${slaDays}</span></div>
          <div class="field"><span class="field-label">Current Status:</span><span class="field-value" style="font-weight: bold; color: #166534;">${ticketRow.Status || "N/A"}</span></div>
        </div>

        <div class="card">
          <h3>Client & Site Info</h3>
          <div class="field"><span class="field-label">Organization Name:</span><span class="field-value">${ticketRow.Company_Name || "N/A"}</span></div>
          <div class="field"><span class="field-label">Primary Site Location:</span><span class="field-value">${ticketRow.Location || "N/A"}</span></div>
          <div class="field"><span class="field-label">Sub-Location:</span><span class="field-value">${ticketRow.Sub_Location || "N/A"}</span></div>
          <div class="field"><span class="field-label">Room / Zone Name:</span><span class="field-value">${ticketRow.Room_Name || "N/A"}</span></div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 30px;">
        <h3>Hardware & Asset Details</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <div class="field"><span class="field-label">Equipment Make:</span><span class="field-value">${ticketRow.ProductMake || "N/A"}</span></div>
            <div class="field"><span class="field-label">Equipment Model:</span><span class="field-value">${ticketRow.ProductModel || "N/A"}</span></div>
            <div class="field"><span class="field-label">Serial Number (S/N):</span><span class="field-value">${ticketRow.ProductSerial || "N/A"}</span></div>
          </div>
          <div>
            <div class="field"><span class="field-label">IP Address:</span><span class="field-value">${ticketRow.IP_Address || "N/A"}</span></div>
            <div class="field"><span class="field-label">MAC ID:</span><span class="field-value">${ticketRow.MAC_ID || "N/A"}</span></div>
            <div class="field"><span class="field-label">Warranty End:</span><span class="field-value">${ticketRow.Warranty_End_Date ? new Date(ticketRow.Warranty_End_Date).toLocaleDateString() : "N/A"}</span></div>
          </div>
        </div>
      </div>

      <div class="section-title">Incident Categories & Admin Remarks</div>
      <div class="field" style="margin-bottom: 10px;">
        <span class="field-label" style="width: auto; margin-right: 15px;"><b>Incident Category:</b></span>
        <span class="field-value">${ticketRow.Category || "Hardware"}</span>
      </div>
      <div class="description-box" style="margin-bottom: 30px;">${ticketRow.Admin_Remarks || "No administrative remarks logged."}</div>

      <div class="section-title">Field Engineer Resolution Summary</div>
      <div class="field" style="margin-bottom: 10px;">
        <span class="field-label" style="width: auto; margin-right: 15px;"><b>Assigned Field Engineer:</b></span>
        <span class="field-value" style="font-weight: bold;">${engineerName}</span>
      </div>
      <div class="description-box">${engineerRemarks}</div>

      <div class="footer">
        <p>This is a system generated Service Report from Audio-Visual Dynamic Pro-Support.</p>
        <p>AV Dynamic LLP | operations@avdynamic.co.in | Secure SLA Log System</p>
      </div>
    </body>
    </html>
  `;

  // Convert to PDF using Google DriveApp
  const blob = HtmlService.createHtmlOutput(htmlTemplate).getAs('application/pdf').setName(`Service_Report_${ticketId}.pdf`);
  const file = DriveApp.getRootFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return jsonResponse({ pdfUrl: file.getUrl() }, true, "PDF Generated successfully");
}

