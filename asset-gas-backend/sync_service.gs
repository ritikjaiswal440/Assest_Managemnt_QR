/**
 * Time-Driven Trigger Sync Service
 * 
 * Instructions on attaching Time-Driven triggers:
 * 1. Open your Google Apps Script editor.
 * 2. Click on the Triggers icon (the clock icon on the left sidebar).
 * 3. Click "+ Add Trigger" in the bottom-right corner.
 * 4. Choose function: dailySlaDatabaseSync
 * 5. Choose deployment: Head
 * 6. Select event source: Time-driven
 * 7. Select type of time-based trigger: Day timer
 * 8. Select time of day: Midnight to 1 AM
 * 9. Click "Save".
 */

function dailySlaDatabaseSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Build branchContractMap from Company_Master for Asset SLA inheritance
  const companySheet = ss.getSheetByName("Company_Master");
  const branchContractMap = {};
  if (companySheet) {
    const cData = companySheet.getDataRange().getValues();
    if (cData.length > 1) {
      const cHeaders = cData[0].map(h => String(h).trim());
      const cRefIdx = cHeaders.indexOf('Ref_Code');
      const cBranchIdx = cHeaders.indexOf('Branch');
      const cAmcStartIdx = cHeaders.indexOf('AMC_Start_Date');
      const cAmcEndIdx = cHeaders.indexOf('AMC_End_Date');
      const cNonAmcStartIdx = cHeaders.indexOf('NON_CAMC_Start_Date');
      const cNonAmcEndIdx = cHeaders.indexOf('NON_CAMC_End_Date');

      for (let j = 1; j < cData.length; j++) {
        const ref = String(cData[j][cRefIdx] || "").trim();
        const branch = String(cData[j][cBranchIdx] || "").trim();
        const key = (ref + "|" + branch).toLowerCase();
        branchContractMap[key] = {
          amcStart: cAmcStartIdx !== -1 ? cData[j][cAmcStartIdx] : "",
          amcEnd: cAmcEndIdx !== -1 ? cData[j][cAmcEndIdx] : "",
          nonAmcStart: cNonAmcStartIdx !== -1 ? cData[j][cNonAmcStartIdx] : "",
          nonAmcEnd: cNonAmcEndIdx !== -1 ? cData[j][cNonAmcEndIdx] : ""
        };
      }
    }
  }

  // 2. Helper routine to sync a single sheet
  const syncSheetSla = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    const range = sheet.getDataRange();
    const data = range.getValues();
    if (data.length <= 1) return;
    
    const headers = data[0].map(h => String(h).trim());
    
    // Dynamically check/add Support_Type column if missing
    let supportIdx = headers.indexOf('Support_Type');
    if (supportIdx === -1) {
      supportIdx = headers.length;
      sheet.getRange(1, supportIdx + 1).setValue('Support_Type');
      headers.push('Support_Type');
      data.forEach((row, rIdx) => {
        if (rIdx === 0) row.push('Support_Type');
        else row.push('');
      });
    }

    const refIdx = headers.indexOf('Ref_Code');
    const branchIdx = headers.indexOf('Branch');
    const dlpStartIdx = headers.indexOf('DLP_Start_Date');
    const dlpEndIdx = headers.indexOf('DLP_End_Date');
    const warrantyStartIdx = headers.indexOf('Warranty_Start_Date');
    const warrantyEndIdx = headers.indexOf('Warranty_End_Date');
    const amcStartIdx = headers.indexOf('AMC_Start_Date');
    const amcEndIdx = headers.indexOf('AMC_End_Date');
    const nonAmcStartIdx = headers.indexOf('NON_CAMC_Start_Date');
    const nonAmcEndIdx = headers.indexOf('NON_CAMC_End_Date');

    let modified = false;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      let dlpStart = dlpStartIdx !== -1 ? row[dlpStartIdx] : "";
      let dlpEnd = dlpEndIdx !== -1 ? row[dlpEndIdx] : "";
      let warrantyStart = warrantyStartIdx !== -1 ? row[warrantyStartIdx] : "";
      let warrantyEnd = warrantyEndIdx !== -1 ? row[warrantyEndIdx] : "";
      
      let amcStart = "";
      let amcEnd = "";
      let nonAmcStart = "";
      let nonAmcEnd = "";

      if (sheetName === 'Asset_Master') {
        // Inherit from Company_Master branch mapping
        const ref = refIdx !== -1 ? String(row[refIdx]).trim() : "";
        const branch = branchIdx !== -1 ? String(row[branchIdx]).trim() : "";
        const key = (ref + "|" + branch).toLowerCase();
        
        if (branchContractMap[key]) {
          const contract = branchContractMap[key];
          amcStart = contract.amcStart;
          amcEnd = contract.amcEnd;
          nonAmcStart = contract.nonAmcStart;
          nonAmcEnd = contract.nonAmcEnd;
        }
      } else {
        // Retrieve directly from Company_Master row
        amcStart = amcStartIdx !== -1 ? row[amcStartIdx] : "";
        amcEnd = amcEndIdx !== -1 ? row[amcEnd] : "";
        nonAmcStart = nonAmcStartIdx !== -1 ? row[nonAmcStartIdx] : "";
        nonAmcEnd = nonAmcEndIdx !== -1 ? row[nonAmcEndIdx] : "";
      }

      const calculated = calculateActiveSupportStatus(dlpStart, dlpEnd, warrantyStart, warrantyEnd, amcStart, amcEnd, nonAmcStart, nonAmcEnd);
      const existing = String(row[supportIdx] || "").trim();

      if (calculated !== existing) {
        row[supportIdx] = calculated;
        modified = true;
      }
    }

    if (modified) {
      // Overwrite the entire range to database in a single batch-write
      sheet.getRange(1, 1, data.length, headers.length).setValues(data);
    }
  };

  // Run updates on both database tables
  syncSheetSla('Company_Master');
  syncSheetSla('Asset_Master');
}
