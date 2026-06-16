// sync_service.gs

// The ProSupport Ticket System endpoint (configured later)
const PROSUPPORT_API_URL = "YOUR_PROSUPPORT_API_URL_HERE";

/**
 * Syncs a single complaint to the external ProSupport Ticket System.
 * 
 * @param {string} complaintId - The ID of the complaint to sync
 */
function pushComplaintToProSupport(complaintId) {
  try {
    // 1. Fetch Complaint
    const complaintRepo = new BaseRepository('Asset_Complaints', true);
    const complaint = complaintRepo.findById(complaintId, 'id');
    
    if (!complaint) {
      Logger.log(`Sync Error: Complaint ${complaintId} not found.`);
      return false;
    }
    
    if (complaint.syncStatus === 'Success') {
      // Already synced
      return true;
    }

    // 2. Fetch Asset & Company for Support Status logic
    const assetRepo = new BaseRepository('Assets', false);
    const asset = assetRepo.findById(complaint.assetId, 'id');
    
    let isChargeable = false;
    let companyName = "Unknown";
    
    if (asset) {
      companyName = asset.companyName || companyName;
      if (asset.refCode) {
        const companyRepo = new BaseRepository('Companies', false);
        const company = companyRepo.findById(asset.refCode, 'id');
        if (company) {
          companyName = company.name || companyName;
          const supportType = company.supportTier || '';
          // If the complaint's Support_Type is "Out of Support", set isChargeable
          if (supportType.toLowerCase().includes('out of support') || (company.amcEnd && new Date(company.amcEnd) < new Date())) {
            isChargeable = true;
          }
        }
      }
    }

    // 3. Build Payload
    const payload = {
      action: "createServiceRequest",
      source: "AssetSystem",
      complaintId: complaint.id,
      assetId: complaint.assetId,
      companyName: companyName,
      requestedBy: complaint.clientName,
      clientEmail: complaint.clientEmail,
      phoneNumber: complaint.phoneNumber,
      description: complaint.description,
      timestamp: complaint.timestamp,
      isChargeable: isChargeable
    };

    // 4. Execute Post Request to ProSupport System
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Only attempt fetch if the URL is configured, to avoid errors during initial testing
    if (PROSUPPORT_API_URL.includes('YOUR_PROSUPPORT_API_URL')) {
      Logger.log(`Mock Sync: ${complaintId} (URL not configured)`);
      // Update as Failed for retry testing
      complaint.syncStatus = 'Failed';
      complaintRepo.save(complaint, 'id');
      return false;
    }

    const response = UrlFetchApp.fetch(PROSUPPORT_API_URL, options);
    const responseCode = response.getResponseCode();
    
    // 5. Two-Step Commit Update
    if (responseCode === 200 || responseCode === 201) {
      let responseBody = {};
      try {
        responseBody = JSON.parse(response.getContentText());
      } catch (e) {
        // Ignore json parse error
      }
      
      complaint.syncStatus = 'Success';
      complaint.serviceRequestNo = responseBody.requestId || responseBody.data?.requestId || 'SR-GENERATED';
      if (isChargeable) {
        complaint.billingFlag = 'Pending Quote';
      } else {
        complaint.billingFlag = 'In Support';
      }
      complaintRepo.save(complaint, 'id');
      return true;
    } else {
      throw new Error(`Non-200 Response: ${responseCode} - ${response.getContentText()}`);
    }
  } catch (error) {
    Logger.log(`Sync Failure [${complaintId}]: ${error.message}`);
    // Update as Failed so cron job picks it up
    try {
      const complaintRepo = new BaseRepository('Asset_Complaints', true);
      const complaint = complaintRepo.findById(complaintId, 'id');
      if (complaint) {
        complaint.syncStatus = 'Failed';
        complaintRepo.save(complaint, 'id');
      }
    } catch (e) {
      Logger.log(`Critical Database Failure: Could not update Sync_Status to Failed.`);
    }
    return false;
  }
}

/**
 * Retry Cron Job: Processes any pending or failed syncs.
 * Bind this to a time-driven trigger (e.g., every 15 minutes).
 */
function processPendingSyncs() {
  try {
    const complaintRepo = new BaseRepository('Asset_Complaints', true);
    const allComplaints = complaintRepo.findAll();
    
    // Query rows where Sync_Status is strictly 'Pending' or 'Failed'
    const pendingComplaints = allComplaints.filter(c => c.syncStatus === 'Pending' || c.syncStatus === 'Failed');
    
    if (pendingComplaints.length === 0) {
      Logger.log("processPendingSyncs: No pending syncs found.");
      return;
    }
    
    Logger.log(`processPendingSyncs: Found ${pendingComplaints.length} tickets to sync.`);
    
    let successCount = 0;
    
    for (const row of pendingComplaints) {
      const success = pushComplaintToProSupport(row.id);
      if (success) {
        successCount++;
      }
    }
    
    Logger.log(`processPendingSyncs: Successfully synced ${successCount} out of ${pendingComplaints.length}.`);
    
  } catch (error) {
    Logger.log(`processPendingSyncs Error: ${error.message}`);
  }
}
