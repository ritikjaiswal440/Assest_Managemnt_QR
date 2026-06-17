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
  return handleRequest(e, 'POST');
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
      case 'getDashboardKPIs':
        responseData = handleGetDashboardKPIs(payload).data;
        break;
      case 'getFailureTrends':
        responseData = handleGetFailureTrends(payload).data;
        break;
      case 'createAsset':
        responseData = handleCreateAsset(payload);
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
