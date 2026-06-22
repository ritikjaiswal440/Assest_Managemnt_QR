// api_router.gs

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Bad Request: Payload is missing or corrupt.");
    }
    const payload = JSON.parse(e.postData.contents);
    // Resilient Action Extraction (fallback to body if query parameter was dropped)
    const action = (e.parameter && e.parameter.action) || payload.action; 

    if (!action) {
       throw new Error("Field Violation: Missing execution action reference.");
    }

    // Explicitly handle pushToIntake route
    if (action === "pushToIntake") {
         const resObj = handlePushToIntake(payload);
         return ContentService.createTextOutput(JSON.stringify(resObj))
           .setMimeType(ContentService.MimeType.JSON);
    }

    return handleRequest(e, 'POST');
  } catch (error) {
    // Fail-Safe Response to prevent CORS crashes from fatal unhandled exceptions
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Central request handler
 */
function handleRequest(e, method) {
  try {
    const params = e.parameter || {};
    
    let payload = {};
    if (method === 'POST' && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
        
        // Debug Tracer for Complaint Submission
        if (payload.action === 'submitComplaint' && !payload.security_signature) {
          return ContentService.createTextOutput(JSON.stringify({ 
              status: "error", 
              message: "403 Forbidden: Missing Security Signature.",
              debug_received_payload: payload 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      } catch(err) {
        throw new Error("Invalid JSON payload.");
      }
    }

    // Extract route from parameters or body payload
    const route = params.route || params.action || payload.route || payload.action;
    
    if (!route) {
      throw new Error("No route provided.");
    }

    // Example Route Dispatcher
    let responseData = null;
    let responseMessage = "Success";

    switch(route) {
      case 'health':
        responseData = { status: 'healthy', timestamp: new Date().toISOString() };
        break;
      case 'getPublicAssetDetails':
        responseData = handleGetPublicAssetDetails(payload);
        break;
      case 'generateQRSig':
        responseData = handleGenerateQRSig(payload);
        break;
      case 'submitComplaint':
        responseData = handleSubmitComplaint(payload);
        break;
      case 'importAssets':
        responseData = handleImportAssets(payload);
        break;
      case 'importCompanies':
        responseData = handleImportCompanies(payload);
        break;
      case 'exportData':
        responseData = handleExportData(payload).data;
        break;
      case 'getAssets':
        responseData = handleExportData({ entityType: 'Assets' }).data;
        break;
      case 'getCompanies':
        responseData = handleExportData({ entityType: 'Companies' }).data;
        break;
      case 'getComplaints':
        responseData = handleGetComplaints();
        break;
      case 'pushToIntake':
        {
          const resObj = handlePushToIntake(payload);
          return ContentService.createTextOutput(JSON.stringify(resObj))
            .setMimeType(ContentService.MimeType.JSON);
        }
      case 'getDashboardKPIs':
        responseData = handleGetDashboardKPIs(payload).data;
        break;
      case 'getFailureTrends':
        responseData = handleGetFailureTrends(payload).data;
        break;
      case 'createCompany':
        responseData = handleCreateCompany(payload);
        break;
      case 'createAsset':
        responseData = handleCreateAsset(payload);
        break;
      case 'updateCompany':
        responseData = handleUpdateCompany(payload);
        break;
      case 'updateAsset':
        responseData = handleUpdateAsset(payload);
        break;
      default:
        throw new Error("Unknown route: " + route);
    }

    return createSuccessResponse(responseData, responseMessage);

  } catch (error) {
    return createErrorResponse(error.message);
  }
}

/**
 * Generates a standard success JSON response
 */
function createSuccessResponse(data, message = "Operation successful") {
  const response = {
    status: "success",
    success: true,
    data: data,
    message: message
  };
  
  // If data is a structured object with stats or success fields (like from import handlers),
  // bubble them up to the root response to match client expectations
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.hasOwnProperty('success')) response.success = data.success;
    if (data.hasOwnProperty('message')) response.message = data.message;
    if (data.hasOwnProperty('stats')) response.stats = data.stats;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Generates a standard error JSON response
 */
function createErrorResponse(errorMessage) {
  const response = {
    status: "error",
    success: false,
    data: null,
    message: errorMessage
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle OPTIONS requests for CORS (Preflight)
 * GAS automatically handles CORS if set up properly in deployments, 
 * but sometimes we need to explicitly support it.
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle Asset Creation with sequential Unique_Product_Id
 */
function handleCreateAsset(payload) {
  if (!payload.refCode || !payload.companyName) {
    throw new Error("Missing required fields: Both Company Name and Ref Code are required for Hardware Assignment.");
  }

  const assetRepo = new BaseRepository('Assets', false);
  const existingAssets = assetRepo.findAll();
  
  let maxSeq = 0;
  for (let i = 0; i < existingAssets.length; i++) {
    const asset = existingAssets[i];
    if (asset.id && asset.id.startsWith('AVD/PD/')) {
      const numStr = asset.id.replace('AVD/PD/', '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  
  const nextSeq = maxSeq + 1;
  const newId = 'AVD/PD/' + nextSeq.toString().padStart(6, '0');
  
  payload.id = newId;
  if (!payload.Created_At && !payload.createdAt) {
    payload.Created_At = new Date().toISOString();
  }
  const savedAsset = assetRepo.save(payload, 'id');
  return savedAsset;
}

/**
 * Handle Asset Update
 */
function handleUpdateAsset(payload) {
  if (!payload.id) {
    throw new Error("Missing asset ID for update.");
  }
  const assetRepo = new BaseRepository('Assets', false);
  const updatedAsset = assetRepo.save(payload, 'id');
  return updatedAsset;
}

/**
 * Handle Company Creation (POST route logic for Company_Master)
 * Enforces strict array mapping to prevent column drift.
 */
function handleCreateCompany(payload) {
  // Validate Required Fields
  if (!payload.Ref_Code || !payload.Company_Name) {
    throw new Error("Missing required fields: Ref_Code and Company_Name are mandatory.");
  }
  
  try {
    // database_core.gs helper
    const sheet = getSheet('Company_Master'); 
    
    // Schema Check: Exact array mapping for [Ref_Code, Company_Name, Location, Branch, Support_Type, AMC_Start_Date, AMC_End_Date, Primary_Contact, Primary_Email, Primary_Phone, Status, Created_At]
    const rowData = [
      payload.Ref_Code || '',
      payload.Company_Name || '',
      payload.Location || '',
      payload.Branch || '',
      payload.Support_Type || 'Comprehensive AMC',
      payload.AMC_Start_Date || '',
      payload.AMC_End_Date || '',
      payload.Primary_Contact || '',
      payload.Primary_Email || '',
      payload.Primary_Phone || '',
      payload.Status || 'Active',
      payload.Created_At || new Date().toISOString()
    ];
    
    // Attempt the append
    sheet.appendRow(rowData);
    
    // Return the required success payload
    return {
      success: true,
      data: payload,
      message: "Company saved successfully."
    };

  } catch (err) {
    // Response Integrity: Throwing the error here lets the api_router catch block 
    // catch it and safely formulate the { status: "error", message: ... } JSON response.
    throw new Error("Failed to append row: " + err.message);
  }
}

/**
 * Handle Company Updates with Composite Key
 */
function handleUpdateCompany(payload) {
  const originalKeys = payload.originalKeys;
  const newData = payload.newData;

  if (!originalKeys || !originalKeys.Ref_Code || !originalKeys.Company_Name) {
    throw new Error("Missing originalKeys for update operation.");
  }

  const sheet = getSheet('Company_Master');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const refCodeIdx = headers.indexOf('Ref_Code');
  const nameIdx = headers.indexOf('Company_Name');
  const branchIdx = headers.indexOf('Branch');

  if (refCodeIdx === -1 || nameIdx === -1) {
    throw new Error("Invalid sheet schema: missing Ref_Code or Company_Name columns.");
  }

  let foundRowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const matchRef = String(row[refCodeIdx] || '').toLowerCase() === String(originalKeys.Ref_Code).toLowerCase();
    const matchName = String(row[nameIdx] || '').toLowerCase() === String(originalKeys.Company_Name).toLowerCase();
    
    // Check Branch, but tolerate undefined if old records lack a branch
    const rowBranch = String(row[branchIdx] || '').toLowerCase();
    const targetBranch = String(originalKeys.Branch || '').toLowerCase();
    const matchBranch = (branchIdx === -1) || (rowBranch === targetBranch);

    if (matchRef && matchName && matchBranch) {
      foundRowIndex = i + 1; // +1 because array is 0-indexed but sheets are 1-indexed
      break;
    }
  }

  if (foundRowIndex === -1) {
    throw new Error("Company not found for the given composite keys. Cannot update.");
  }

  // Map to the exact 12-column schema
  const updatedArray = [
    newData.Ref_Code || '',
    newData.Company_Name || '',
    newData.Location || '',
    newData.Branch || '',
    newData.Support_Type || 'Comprehensive AMC',
    newData.AMC_Start_Date || '',
    newData.AMC_End_Date || '',
    newData.Primary_Contact || '',
    newData.Primary_Email || '',
    newData.Primary_Phone || '',
    newData.Status || 'Active',
    newData.Created_At || new Date().toISOString()
  ];

  try {
    sheet.getRange(foundRowIndex, 1, 1, 12).setValues([updatedArray]);
    return {
      success: true,
      data: newData,
      message: "Company updated successfully."
    };
  } catch (err) {
    throw new Error("Failed to overwrite row: " + err.message);
  }
}

/**
 * Handle fetching complaints directly from Asset_Complaints_2026 sheet.
 * Maps exact 28-column master schema to JSON.
 */
function handleGetComplaints() {
  const sheetName = 'Asset_Complaints_2026';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return []; // Only headers or empty
  }
  
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    results.push({
      Complaint_ID: row[0] || '',
      Unique_Product_Id: row[1] || '',
      Ref_Code: row[2] || '',
      Company_Name: row[3] || '',
      Location: row[4] || '',
      Sub_Location: row[5] || '',
      Floor: row[6] || '',
      Room_Type: row[7] || '',
      Room_Name: row[8] || '',
      ProductMake: row[9] || '',
      ProductModel: row[10] || '',
      SerialNumber: row[11] || '',
      Asset_Status: row[12] || '',
      Warranty_Start_Date: row[13] || '',
      Warranty_End_Date: row[14] || '',
      DLP_Period: row[15] || '',
      Warranty_Days_Left: row[16] || '',
      Requested_By: row[17] || '',
      Client_Email: row[18] || '',
      PhoneNumber: row[19] || '',
      Description: row[20] || '',
      Support_Type: row[21] || '',
      Status: row[22] || '',
      Sync_Status: row[23] || '',
      Created_At: row[24] || '',
      Request_ID: row[25] || '',
      Parent_Ticket_ID: row[26] || '',
      Assigned_Engineer: row[27] || ''
    });
  }
  
  return results;
}

function handlePushToIntake(payload) {
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      throw new Error("Invalid payload: " + e.message);
    }
  }

  const complaintId = payload.Complaint_ID;
  if (!complaintId) {
    throw new Error("Missing Complaint_ID in payload.");
  }

  // 1. Get Staging Sheet (Asset_Complaints_2026) from active spreadsheet container
  const activeSS = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheets = activeSS.getSheets();
  const complaintsSheet = activeSheets.find(s => s.getName().trim().toLowerCase() === 'asset_complaints_2026');
  
  if (!complaintsSheet) {
    throw new Error("Source sheet 'Asset_Complaints_2026' not found in active spreadsheet.");
  }

  const data = complaintsSheet.getDataRange().getValues();
  let foundRowIndex = -1;
  
  // Find original row
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(complaintId).trim()) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex === -1) {
    throw new Error("Original complaint not found in Asset_Complaints_2026.");
  }

  // 2. Perform Transaction to Core Ticketing System (via PROSUPPORT_API_URL)
  const corePayload = {
    action: "insertIntakeTicket",
    ...payload
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(corePayload),
    muteHttpExceptions: true
  };

  // Resolve external API URL
  const apiEndpoint = (typeof PROSUPPORT_API_URL !== 'undefined') ? PROSUPPORT_API_URL : '';
  if (!apiEndpoint || apiEndpoint.includes('YOUR_PROSUPPORT_API_URL')) {
    throw new Error("Core Ticketing System API (PROSUPPORT_API_URL) is not configured in script properties or global constants.");
  }

  const response = UrlFetchApp.fetch(apiEndpoint, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode !== 200 && responseCode !== 201) {
    throw new Error("Core Ticketing System returned status " + responseCode + ": " + response.getContentText());
  }

  let responseData;
  try {
    responseData = JSON.parse(response.getContentText());
  } catch(e) {
    throw new Error("Failed to parse Core Ticketing System response: " + e.message);
  }

  // Handle case where response indicates failure
  if (responseData.status === 'error' || responseData.success === false) {
    throw new Error("Core Ticketing System failed: " + (responseData.message || "Unknown error"));
  }

  // 3. Update Status cell (Index 22 => Column 23) to "Transferred"
  // Update Sync_Status cell (Index 23 => Column 24) to "Success"
  try {
    complaintsSheet.getRange(foundRowIndex, 23).setValue("Transferred");
    complaintsSheet.getRange(foundRowIndex, 24).setValue("Success");
  } catch(err) {
    throw new Error("Failed to update staging status locally: " + err.message);
  }

  return {
    success: true,
    status: "success",
    message: "Ticket successfully transferred to Client Intake Queue"
  };
}
