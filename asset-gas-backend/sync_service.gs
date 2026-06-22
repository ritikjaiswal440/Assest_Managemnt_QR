// sync_service.gs

// The ProSupport Ticket System endpoint
const PROSUPPORT_API_URL = "https://script.google.com/macros/s/AKfycbxMHiISb7-mnHbpr96ojPUJbeWHkX7EQpwJeCVAW-XyiPExTKSxpUOhCFPQICyXAdGb/exec";

/**
 * Syncs a single intake complaint to the external ProSupport Ticket System.
 * 
 * @param {string} intakeId - The ID of the intake queue record to sync
 */
function pushComplaintToProSupport(intakeId) {
  try {
    const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Intake_Queue');
    if (!queueSheet) {
      Logger.log("Sync Error: Intake_Queue sheet not found.");
      return false;
    }
    
    const data = queueSheet.getDataRange().getValues();
    const headers = getHeaders(queueSheet);
    
    const idIdx = headers.indexOf('Intake_ID');
    const payloadIdx = headers.indexOf('Payload');
    const timestampIdx = headers.indexOf('Timestamp');
    const syncStatusIdx = headers.indexOf('Sync_Status');
    const requestIdIdx = headers.indexOf('Request_ID');
    
    if (idIdx === -1 || payloadIdx === -1 || syncStatusIdx === -1 || requestIdIdx === -1) {
      Logger.log("Sync Error: Intake_Queue schema mismatch.");
      return false;
    }

    let foundRowIndex = -1;
    let intakeRow = null;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim() === String(intakeId).trim()) {
        foundRowIndex = i + 1;
        intakeRow = data[i];
        break;
      }
    }
    
    if (foundRowIndex === -1) {
      Logger.log(`Sync Error: Intake ID ${intakeId} not found.`);
      return false;
    }
    
    if (String(intakeRow[syncStatusIdx]).trim() === 'Success') {
      return true; // Already synced
    }

    let payloadObj = {};
    try {
      payloadObj = JSON.parse(intakeRow[payloadIdx] || '{}');
    } catch(e) {
      Logger.log("Sync Error: Failed to parse payload JSON.");
    }
    
    // Fetch Asset details to determine AMC support status
    const assetId = payloadObj.Unique_Product_Id || payloadObj.unique_product_id || payloadObj.assetId || "";
    let isChargeable = false;
    let companyName = "Unknown";
    
    if (assetId) {
      const assetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Asset_Master');
      if (assetSheet) {
        const assetData = assetSheet.getDataRange().getValues();
        const assetHeaders = getHeaders(assetSheet);
        const aIdIdx = assetHeaders.indexOf('Unique_Product_Id');
        const aCompRefIdx = assetHeaders.indexOf('Ref_Code');
        const aCompNameIdx = assetHeaders.indexOf('Company_Name');
        
        if (aIdIdx !== -1) {
          for (let i = 1; i < assetData.length; i++) {
            if (String(assetData[i][aIdIdx]).trim() === String(assetId).trim()) {
              companyName = assetData[i][aCompNameIdx] || companyName;
              const refCode = assetData[i][aCompRefIdx];
              
              if (refCode) {
                const companySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Company_Master');
                if (companySheet) {
                  const compData = companySheet.getDataRange().getValues();
                  const compHeaders = getHeaders(companySheet);
                  const cRefIdx = compHeaders.indexOf('Ref_Code');
                  const cSupportIdx = compHeaders.indexOf('Support_Type');
                  const cEndIdx = compHeaders.indexOf('AMC_End_Date');
                  
                  if (cRefIdx !== -1) {
                    for (let j = 1; j < compData.length; j++) {
                      if (String(compData[j][cRefIdx]).trim() === String(refCode).trim()) {
                        companyName = compData[j][compHeaders.indexOf('Company_Name')] || companyName;
                        const supportType = compData[j][cSupportIdx] || '';
                        const amcEnd = compData[j][cEndIdx];
                        
                        if (supportType.toLowerCase().includes('out of support') || (amcEnd && new Date(amcEnd) < new Date())) {
                          isChargeable = true;
                        }
                        break;
                      }
                    }
                  }
                }
              }
              break;
            }
          }
        }
      }
    }

    const finalPayload = {
      action: "createServiceRequest",
      source: "AssetSystem",
      complaintId: intakeId,
      assetId: assetId,
      companyName: companyName,
      requestedBy: payloadObj.requestedBy || payloadObj.requesterName || "Client Portal User",
      clientEmail: payloadObj.clientEmail || payloadObj.email || "",
      phoneNumber: payloadObj.phoneNumber || "",
      description: payloadObj.description || payloadObj.issueDescription || "",
      timestamp: intakeRow[timestampIdx] || new Date().toISOString(),
      isChargeable: isChargeable
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(finalPayload),
      muteHttpExceptions: true
    };

    if (PROSUPPORT_API_URL.includes('YOUR_PROSUPPORT_API_URL')) {
      Logger.log(`Mock Sync: ${intakeId} (URL not configured)`);
      queueSheet.getRange(foundRowIndex, syncStatusIdx + 1).setValue("Failed");
      return false;
    }

    const response = UrlFetchApp.fetch(PROSUPPORT_API_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      let responseBody = {};
      try {
        responseBody = JSON.parse(response.getContentText());
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      const generatedSrNo = responseBody.requestId || responseBody.data?.requestId || 'SR-GENERATED';
      
      queueSheet.getRange(foundRowIndex, syncStatusIdx + 1).setValue("Success");
      queueSheet.getRange(foundRowIndex, requestIdIdx + 1).setValue(generatedSrNo);
      
      logSystemAction("SYSTEM", `Successfully synced intake ${intakeId} to external ProSupport as ${generatedSrNo}`);
      return true;
    } else {
      throw new Error(`Non-200 Response: ${responseCode} - ${response.getContentText()}`);
    }
  } catch (error) {
    Logger.log(`Sync Failure [${intakeId}]: ${error.message}`);
    try {
      const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Intake_Queue');
      if (queueSheet) {
        const data = queueSheet.getDataRange().getValues();
        const headers = getHeaders(queueSheet);
        const idIdx = headers.indexOf('Intake_ID');
        const syncStatusIdx = headers.indexOf('Sync_Status');
        if (idIdx !== -1 && syncStatusIdx !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][idIdx]).trim() === String(intakeId).trim()) {
              queueSheet.getRange(i + 1, syncStatusIdx + 1).setValue("Failed");
              break;
            }
          }
        }
      }
    } catch (e) {
      Logger.log(`Critical Database Failure: Could not update Sync_Status to Failed.`);
    }
    return false;
  }
}

/**
 * Sweep and sync pending or failed dispatches.
 */
function processPendingSyncs() {
  try {
    const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Intake_Queue');
    if (!queueSheet) {
      Logger.log("processPendingSyncs: Intake_Queue sheet not found.");
      return;
    }
    
    const data = queueSheet.getDataRange().getValues();
    const headers = getHeaders(queueSheet);
    
    const idIdx = headers.indexOf('Intake_ID');
    const syncStatusIdx = headers.indexOf('Sync_Status');
    
    if (idIdx === -1 || syncStatusIdx === -1) {
      Logger.log("processPendingSyncs: Missing Intake_Queue schemas.");
      return;
    }
    
    const pendingIntakes = [];
    for (let i = 1; i < data.length; i++) {
      const syncStatus = String(data[i][syncStatusIdx]).trim();
      if (syncStatus === 'Pending' || syncStatus === 'Failed' || syncStatus === '') {
        pendingIntakes.push(data[i][idIdx]);
      }
    }
    
    if (pendingIntakes.length === 0) {
      Logger.log("processPendingSyncs: No pending syncs found.");
      return;
    }
    
    Logger.log(`processPendingSyncs: Found ${pendingIntakes.length} tickets to sync.`);
    
    let successCount = 0;
    for (const intakeId of pendingIntakes) {
      const success = pushComplaintToProSupport(intakeId);
      if (success) {
        successCount++;
      }
    }
    
    Logger.log(`processPendingSyncs: Successfully synced ${successCount} out of ${pendingIntakes.length}.`);
    
  } catch (error) {
    Logger.log(`processPendingSyncs Error: ${error.message}`);
  }
}
