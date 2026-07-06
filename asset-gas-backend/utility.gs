/**
 * AV Dynamic Pro-Support Engine - Monolithic Utilities
 * Reusable helper functions for sheet operations, logging, and communications.
 */

/**
 * Transforms standard 2D sheet matrices rows into JSON array objects mapping columns to header strings.
 */
function fetchSheetRecordsAsObjects(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ss.getSheetByName(sheetName);
  if (!targetSheet) return [];
  
  const rawDataGrid = targetSheet.getDataRange().getDisplayValues();
  if (rawDataGrid.length < 2) return [];
  
  const headers = rawDataGrid.shift();
  return rawDataGrid.map(row => {
    let mappingEntityInstance = {};
    headers.forEach((h, indexPointer) => {
      const operationalCleanKey = h.trim().replace(/\s+/g, '_');
      mappingEntityInstance[operationalCleanKey] = row[indexPointer];
    });
    return mappingEntityInstance;
  });
}

/**
 * Calculates standardized tracking alphanumeric indices matching fiscal year boundaries (e.g., AVD/PT/26-27/0004).
 */
function calculateIncrementalIdentifier(sheet, sequencePrefix) {
  const calendarDate = new Date();
  let financialYearStartMarker = calendarDate.getFullYear();
  
  // Fiscal target alignment calculation shifting on April 1st
  if (calendarDate.getMonth() < 3) financialYearStartMarker--;
  const structuralYearEndMarker = (financialYearStartMarker + 1).toString().slice(-2);
  const localizedFiscalString = `${financialYearStartMarker.toString().slice(-2)}-${structuralYearEndMarker}`;
  
  const targetFormStringPrefix = `AVD/${sequencePrefix}/${localizedFiscalString}/`;
  const rawDataMatrix = sheet.getDataRange().getValues();
  let sequenceTrackerIndex = 0;

  for(let i = 1; i < rawDataMatrix.length; i++) {
     const identificationStringPointer = rawDataMatrix[i][0] ? rawDataMatrix[i][0].toString() : '';
     if(identificationStringPointer.startsWith(targetFormStringPrefix)) {
        const parsedSequenceInt = parseInt(identificationStringPointer.split('/').pop(), 10);
        if(!isNaN(parsedSequenceInt) && parsedSequenceInt > sequenceTrackerIndex) {
          sequenceTrackerIndex = parsedSequenceInt;
        }
     }
  }
  return `${targetFormStringPrefix}${(sequenceTrackerIndex + 1).toString().padStart(4, '0')}`;
}

/**
 * Commits security auditing trails to isolated log records in System_Logs.
 */
function logSystemAction(actorEmail, message, level = "INFO") {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('System_Logs');
    if (!logSheet) return;

    const logId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    
    logSheet.appendRow([
      logId,
      timestamp,
      level,
      message,
      actorEmail || 'SYSTEM'
    ]);
  } catch (criticalFailureObfuscation) {
    console.error("Audit Engine Failure: " + criticalFailureObfuscation.toString());
  }
}

/**
 * Wraps clean messaging texts into standard branded corporate email HTML markup.
 */
function generateBrandedHtmlEmailTemplate(title, messageBody) {
  const structuralBrandLogoWebAddress = "https://avdynamic.co.in/wp-content/uploads/2025/07/Av-Dynamics-Logo-2-scaled.png";
  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 30px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="background-color: #2c3e50; padding: 25px; text-align: center;">
        <img src="${structuralBrandLogoWebAddress}" alt="AV Dynamic" style="max-height: 60px; margin-bottom: 10px;" />
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: normal;">${title}</h2>
      </div>
      <div style="padding: 30px; color: #333333; line-height: 1.6; font-size: 15px;">
        ${messageBody}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin-bottom: 15px; font-size: 14px; color: #64748b; font-weight: bold;">Quick Links</p>
          <a href="https://prosupport.avdynamic.co.in/#/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #2c3e50; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; margin: 5px;">Access Dashboard</a>
          <a href="https://prosupport.avdynamic.co.in/#/track" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; margin: 5px;">Track Request</a>
        </div>
      </div>
      <div style="background-color: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d;">
        <p style="margin: 0;"><b>AV Dynamic LLP</b> | Audio-Visual Dynamic Pro-Support</p>
        <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} AV Dynamic LLP. All rights reserved.</p>
      </div>
    </div>
  </div>
  `;
}

/**
 * Dynamically calculates Support Type based on current date and contract timelines.
 * Priority: DLP > Warranty > Comprehensive AMC > Non-Comprehensive AMC > Out Of Support
 */
function calculateActiveSupportStatus(dlpStart, dlpEnd, warrantyStart, warrantyEnd, amcStart, amcEnd, nonAmcStart, nonAmcEnd) {
  const now = new Date().getTime();
  
  // Helper to safely check if 'now' falls between two dates
  const isActive = (startRaw, endRaw) => {
    if (!startRaw || !endRaw) return false;
    const s = new Date(startRaw).getTime();
    const e = new Date(endRaw).getTime();
    return (!isNaN(s) && !isNaN(e) && now >= s && now <= e);
  };

  // 1. Check DLP Window
  if (isActive(dlpStart, dlpEnd)) {
    return "DLP";
  }
  
  // 2. Check OEM Warranty Window
  if (isActive(warrantyStart, warrantyEnd)) {
    return "Warranty";
  }
  
  // 3. Check Comprehensive AMC Window
  if (isActive(amcStart, amcEnd)) {
    return "Comprehensive AMC";
  }
  
  // 4. Check Non-Comprehensive AMC Window
  if (isActive(nonAmcStart, nonAmcEnd)) {
    return "Non-Comprehensive AMC";
  }
  
  // 5. Default if all timelines are expired or blank
  return "Out Of Support";
}

/**
 * ONE-TIME MIGRATION SCRIPT:
 * Copies legacy SLA dates from Company_Master down to individual assets in Asset_Master.
 * Run this ONCE from the Apps Script Editor.
 */
function migrateLegacySLAToAssets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const compSheet = ss.getSheetByName("Company_Master");
  const assetSheet = ss.getSheetByName("Asset_Master");
  
  if (!compSheet || !assetSheet) throw new Error("Missing Master Sheets.");

  const cData = compSheet.getDataRange().getValues();
  const aData = assetSheet.getDataRange().getValues();
  
  const cHeaders = cData[0].map(h => String(h).trim());
  const aHeaders = aData[0].map(h => String(h).trim());

  // Company Indices
  const cRefIdx = cHeaders.indexOf("Ref_Code");
  const cBranchIdx = cHeaders.indexOf("Branch");
  const cDlpStartIdx = cHeaders.indexOf("DLP_Start_Date");
  const cDlpEndIdx = cHeaders.indexOf("DLP_End_Date");
  const cAmcStartIdx = cHeaders.indexOf("AMC_Start_Date");
  const cAmcEndIdx = cHeaders.indexOf("AMC_End_Date");
  const cNonAmcStartIdx = cHeaders.indexOf("NON_CAMC_Start_Date");
  const cNonAmcEndIdx = cHeaders.indexOf("NON_CAMC_End_Date");

  // Asset Indices
  const aRefIdx = aHeaders.indexOf("Ref_Code");
  const aBranchIdx = aHeaders.indexOf("Branch");
  const aDlpStartIdx = aHeaders.indexOf("DLP_Start_Date");
  const aDlpEndIdx = aHeaders.indexOf("DLP_End_Date");
  const aAmcStartIdx = aHeaders.indexOf("AMC_Start_Date");
  const aAmcEndIdx = aHeaders.indexOf("AMC_End_Date");
  const aNonAmcStartIdx = aHeaders.indexOf("NON_CAMC_Start_Date");
  const aNonAmcEndIdx = aHeaders.indexOf("NON_CAMC_End_Date");

  // 1. Build a map of existing branch contracts
  let branchContracts = {};
  for (let i = 1; i < cData.length; i++) {
    const key = cData[i][cRefIdx] + "|" + cData[i][cBranchIdx];
    branchContracts[key] = {
      dlpS: cData[i][cDlpStartIdx], dlpE: cData[i][cDlpEndIdx],
      amcS: cData[i][cAmcStartIdx], amcE: cData[i][cAmcEndIdx],
      nonS: cData[i][cNonAmcStartIdx], nonE: cData[i][cNonAmcEndIdx]
    };
  }

  let updatedCount = 0;
  
  // 2. Loop through assets and apply legacy dates if they are blank
  const updatedAssets = aData.map((row, index) => {
    if (index === 0) return row;
    
    const key = row[aRefIdx] + "|" + row[aBranchIdx];
    const contract = branchContracts[key];
    
    if (contract) {
      let modified = false;
      // Only migrate if the asset doesn't already have dates
      if (!row[aDlpStartIdx] && contract.dlpS) { row[aDlpStartIdx] = contract.dlpS; row[aDlpEndIdx] = contract.dlpE; modified = true; }
      if (!row[aAmcStartIdx] && contract.amcS) { row[aAmcStartIdx] = contract.amcS; row[aAmcEndIdx] = contract.amcE; modified = true; }
      if (!row[aNonAmcStartIdx] && contract.nonS) { row[aNonAmcStartIdx] = contract.nonS; row[aNonAmcEndIdx] = contract.nonE; modified = true; }
      
      if (modified) updatedCount++;
    }
    return row;
  });

  // 3. Batch write back to database
  if (updatedCount > 0) {
    assetSheet.getRange(1, 1, updatedAssets.length, aHeaders.length).setValues(updatedAssets);
    Logger.log(`Migration Complete: ${updatedCount} assets updated with legacy branch SLAs.`);
  } else {
    Logger.log("No assets required migration.");
  }
}
