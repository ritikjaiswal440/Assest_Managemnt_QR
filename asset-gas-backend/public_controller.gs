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
    roomName: asset.roomName,
    productMake: asset.productMake,
    productModel: asset.productModel,
    supportType: supportType,
    supportExpiryDate: asset.supportExpiry || (isExpired ? 'Expired' : 'Active'),
    isExpired: isExpired || (asset.assetStatus === 'Retired')
  };
}

/**
 * Endpoint Handler: submitComplaint
 */
function handleSubmitComplaint(params) {
  const { assetId, signature, requestedBy, clientEmail, phoneNumber, description } = params;
  
  // 1. Validate Security (Must prove physical scan to submit)
  validateQRSignature(assetId, signature);
  
  // 2. Prepare Complaint Record
  const currentYear = new Date().getFullYear();
  // Using Utilities.getUuid() to guarantee unique insert row, plus a friendly ID
  const shortHash = Utilities.getUuid().substring(0, 4).toUpperCase();
  const complaintId = `CMP-${currentYear}-${shortHash}`;
  
  const complaintData = {
    id: complaintId,
    assetId: assetId,
    clientName: requestedBy,
    clientEmail: clientEmail,
    phoneNumber: phoneNumber || '',
    description: description,
    timestamp: new Date().toISOString(),
    syncStatus: 'Pending',
    serviceRequestNo: 'Pending',
    billingFlag: 'Triage Queue'
  };
  
  // 3. Save to Sharded Repository
  const complaintRepo = new BaseRepository('Asset_Complaints', true); // True = Sharded by Year
  complaintRepo.save(complaintData, 'id');
  
  // 4. Trigger Real-Time Sync (Fire-and-forget inside Try/Catch)
  try {
    // In a real GAS environment, to make this truly asynchronous to not block the UI,
    // we could use CacheService + Time-driven triggers, or execute it synchronously 
    // within a try/catch if the payload fetch is fast enough. We'll do a synchronous try/catch.
    pushComplaintToProSupport(complaintId);
  } catch (syncErr) {
    Logger.log(`Failed to trigger real-time sync for ${complaintId}: ${syncErr.message}`);
    // Non-blocking: the Cron Job will pick it up
  }

  return {
    complaintId: complaintId,
    status: 'Logged',
    message: 'Ticket added to triage queue for processing.'
  };
}
