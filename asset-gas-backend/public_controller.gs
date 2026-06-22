// public_controller.gs

const SECRET_KEY = "AV_DYNAMIC_SECURE_HMAC_KEY_2026"; // Hardcoded securely in GAS environment

/**
 * Validates the HMAC-SHA256 signature for a given Asset ID.
 * Expects the first 8 characters of the hex digest to match the provided signature.
 */
function validateQRSignature(assetId, providedSignature) {
  if (!assetId || !providedSignature) {
    throw new Error("403 Forbidden: Missing Security Signature.");
  }
  
  // Create HMAC-SHA256 hash
  const signatureBytes = Utilities.computeHmacSha256Signature(assetId, SECRET_KEY);
  
  // Convert bytes to hex string
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
 * Endpoint Handler: generateQRSig (Admin Only - Requires authenticated environment)
 * Generates the secure 8-character HMAC signature for a given Asset ID.
 */
function handleGenerateQRSig(params) {
  const { assetId } = params;
  if (!assetId) {
    throw new Error("Missing assetId");
  }
  
  // Create HMAC-SHA256 hash
  const signatureBytes = Utilities.computeHmacSha256Signature(assetId, SECRET_KEY);
  
  // Convert bytes to hex string
  let hexString = signatureBytes.map(function(byte) {
    let hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  
  const signature = hexString.substring(0, 8);
  
  return {
    assetId: assetId,
    signature: signature
  };
}

/**
 * Endpoint Handler: getPublicAssetDetails
 */
function handleGetPublicAssetDetails(params) {
  const { assetId, signature } = params;
  
  // 1. Validate Security
  validateQRSignature(assetId, signature);
  
  // 2. Fetch Asset (Using BaseRepository abstraction)
  const assetRepo = new BaseRepository('Assets', false);
  const asset = assetRepo.findById(assetId, 'id');
  
  if (!asset) {
    throw new Error("Asset not found in registry.");
  }
  
  // 3. Fetch Company (To get Support Type)
  let supportType = 'Unknown';
  let isExpired = false;
  if (asset.refCode) {
    const companyRepo = new BaseRepository('Companies', false);
    const company = companyRepo.findById(asset.refCode, 'id');
    if (company) {
      supportType = company.supportTier || 'Standard';
      if (company.amcEnd) {
        isExpired = new Date(company.amcEnd) < new Date();
      }
    }
  }

  // 4. Sanitize Response (Strip MAC_ID, IP_Address, financial info)
  return {
    assetId: asset.id,
    companyName: asset.companyName,
    location: asset.location,
    subLocation: asset.subLocation,
    roomName: asset.roomName,
    roomType: asset.roomType,
    floor: asset.floor,
    productMake: asset.productMake,
    productModel: asset.productModel,
    productSerial: asset.productSerial,
    supportType: supportType,
    supportExpiryDate: asset.supportExpiry || (isExpired ? 'Expired' : 'Active'),
    isExpired: isExpired || (asset.assetStatus === 'Retired'),
    warrantyStartDate: asset.warrantyStartDate,
    warrantyEndDate: asset.warrantyEndDate,
    dlpPeriod: asset.dlpPeriod,
    warrantyDaysLeft: asset.warrantyDaysLeft,
    assetStatus: asset.assetStatus
  };
}

/**
 * Endpoint Handler: submitComplaint
 */
function handleSubmitComplaint(params) {
  // Extract keys dynamically based on what the frontend passes
  const assetId = params.Unique_Product_Id || params.assetId;
  const signature = params.security_signature || params.signature;
  const { requestedBy, clientEmail, phoneNumber, description } = params;
  
  // 1. Validate Security (Must prove physical scan to submit)
  try {
    validateQRSignature(assetId, signature);
  } catch (err) {
    // Return exact 403 Forbidden error via JSON instead of throwing a runtime exception
    return {
      success: false,
      message: err.message
    };
  }
  
  // 2. Data Enrichment
  let refCode = 'N/A';
  let companyName = 'N/A';
  let location = 'N/A';
  let subLocation = 'N/A';
  let floor = 'N/A';
  let roomType = 'N/A';
  let roomName = 'N/A';
  let productMake = 'N/A';
  let productModel = 'N/A';
  let serialNumber = 'N/A';
  let assetStatus = 'N/A';
  let warrantyStartDate = 'N/A';
  let warrantyEndDate = 'N/A';
  let dlpPeriod = 'N/A';
  let warrantyDaysLeft = 'Expired';
  
  let supportType = 'Unknown';

  try {
    const assetRepo = new BaseRepository('Assets', false);
    const assetRecord = assetRepo.findById(assetId, 'id');
    
    if (assetRecord) {
      refCode = assetRecord.refCode || 'N/A';
      companyName = assetRecord.companyName || 'N/A';
      location = assetRecord.location || 'N/A';
      subLocation = assetRecord.subLocation || 'N/A';
      floor = assetRecord.floor || 'N/A';
      roomType = assetRecord.roomType || 'N/A';
      roomName = assetRecord.roomName || 'N/A';
      productMake = assetRecord.productMake || 'N/A';
      productModel = assetRecord.productModel || 'N/A';
      serialNumber = assetRecord.productSerial || 'N/A';
      assetStatus = assetRecord.assetStatus || 'N/A';
      warrantyStartDate = assetRecord.warrantyStartDate || 'N/A';
      warrantyEndDate = assetRecord.warrantyEndDate || 'N/A';
      dlpPeriod = assetRecord.dlpPeriod || 'N/A';
      
      // Calculate Warranty_Days_Left
      if (warrantyEndDate && warrantyEndDate !== 'N/A') {
        const endDate = new Date(warrantyEndDate);
        if (!isNaN(endDate.getTime())) {
          const today = new Date();
          const diffTime = endDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          warrantyDaysLeft = diffDays > 0 ? diffDays : 'Expired';
        }
      }
      
      const companyRepo = new BaseRepository('Companies', false);
      const companyRecord = companyRepo.findById(refCode, 'id'); 
      
      if (companyRecord) {
        supportType = companyRecord.supportTier || companyRecord.Support_Type || 'Standard';
        if (companyRecord.amcEnd && new Date(companyRecord.amcEnd) < new Date()) {
          supportType = 'Out of Support';
        }
      }
    }
  } catch (enrichErr) {
    Logger.log(`Enrichment failed for ${assetId}: ${enrichErr.message}`);
    // Non-fatal, keep defaults
  }
  
  // 3. Generate System Variables
  const currentYear = new Date().getFullYear();
  const shortHash = Utilities.getUuid().substring(0, 4).toUpperCase();
  const complaintId = `CMP-${currentYear}-${shortHash}`;
  const createdAt = new Date().toISOString();
  
  // 4. Construct Strict 28-Column Schema Array
  const finalArray = [
    complaintId,            // 1. Complaint_ID
    assetId,                // 2. Unique_Product_Id
    refCode,                // 3. Ref_Code
    companyName,            // 4. Company_Name
    location,               // 5. Location
    subLocation,            // 6. Sub_Location
    floor,                  // 7. Floor
    roomType,               // 8. Room_Type
    roomName,               // 9. Room_Name
    productMake,            // 10. ProductMake
    productModel,           // 11. ProductModel
    serialNumber,           // 12. SerialNumber
    assetStatus,            // 13. Asset_Status
    warrantyStartDate,      // 14. Warranty_Start_Date
    warrantyEndDate,        // 15. Warranty_End_Date
    dlpPeriod,              // 16. DLP_Period
    warrantyDaysLeft,       // 17. Warranty_Days_Left
    requestedBy || '',      // 18. Requested_By
    clientEmail || '',      // 19. Client_Email
    phoneNumber || '',      // 20. PhoneNumber
    description || '',      // 21. Description
    supportType,            // 22. Support_Type
    "Open",                 // 23. Status
    "Pending",              // 24. Sync_Status
    createdAt,              // 25. Created_At
    "",                     // 26. Request_ID
    "",                     // 27. Parent_Ticket_ID
    ""                      // 28. Assigned_Engineer
  ];
  
  // 5. Append Exact Array
  try {
    const sheetName = `Asset_Complaints_${currentYear}`;
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
      // Fallback if the sharded sheet hasn't been created yet
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
      // We could add headers here if needed, but assuming it exists
    }
    
    sheet.appendRow(finalArray);
  } catch (dbErr) {
    throw new Error("Failed to write complaint to database: " + dbErr.message);
  }
  
  // 6. Trigger Real-Time Sync (Fire-and-forget inside Try/Catch)
  try {
    if (typeof pushComplaintToProSupport === 'function') {
      pushComplaintToProSupport(complaintId);
    }
  } catch (syncErr) {
    Logger.log(`Failed to trigger real-time sync for ${complaintId}: ${syncErr.message}`);
  }

  return {
    complaintId: complaintId,
    status: 'Logged',
    message: 'Ticket added to triage queue for processing.'
  };
}
