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
