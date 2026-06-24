/**
 * setupMasterDatabase
 * Automatically builds the Master Database tables and updates column headers.
 */
function setupMasterDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const schemas = [
    {
      name: "System_Users",
      headers: ['Name', 'Email', 'Role', 'Password', 'Company_Name', 'Status', 'Last_Login']
    },
    {
      name: "Company_Master",
      headers: ['Ref_Code', 'Company_Name', 'Location', 'Branch', 'Support_Type', 'AMC_Start_Date', 'AMC_End_Date', 'Primary_Contact', 'Primary_Email', 'Primary_Phone', 'Status', 'Created_At', 'ClientLink']
    },
    {
      name: "Asset_Master",
      headers: ['Unique_Product_Id', 'Sales_Order', 'Invoice_No', 'Ref_Code', 'Company_Name', 'Location', 'Sub_Location', 'Room_Type', 'Floor', 'Room_Name', 'ProductMake', 'ProductModel', 'ProductSerial', 'MAC_ID', 'IP_Address', 'Warranty_Start_Date', 'DLP_Period', 'Warranty_End_Date', 'Warranty_Days_Left', 'Asset_Status', 'Created_At', 'Updated_At']
    },
    {
      name: "Intake_Queue",
      headers: ['Intake_ID', 'Source', 'Unique_Product_Id', 'Sales_Order', 'Invoice_No', 'Ref_Code', 'Company_Name', 'Location', 'Sub_Location', 'Room_Type', 'Floor', 'Room_Name', 'ProductMake', 'ProductModel', 'ProductSerial', 'MAC_ID', 'IP_Address', 'Warranty_Start_Date', 'DLP_Period', 'Warranty_End_Date', 'Warranty_Days_Left', 'Asset_Status', 'Requester_Name', 'Client_Email', 'PhoneNumber', 'Category', 'Issue_Description', 'Attachment_URL', 'Status', 'Timestamp']
    },
    {
      name: "Master_Tickets",
      headers: ['Ticket_ID', 'Intake_ID_Ref', 'Ref_Code', 'Company_Name', 'Requester_Name', 'Client_Email', 'PhoneNumber', 'Location', 'Sub_Location', 'Room_Name', 'ProductMake', 'ProductModel', 'ProductSerial', 'MAC_ID', 'IP_Address', 'Sales_Order', 'Warranty_End_Date', 'Category', 'Attachment_URL', 'Service_Type', 'Status', 'Assigned_Engineer', 'Open_Date', 'Close_Date', 'Resolved_Days', 'Admin_Remarks']
    },
    {
      name: "Engineer_Tasks",
      headers: ['Task_ID', 'Ticket_ID_Ref', 'Engineer_Name', 'Engineer_Email', 'Status', 'Assigned_Date', 'Closed_Date', 'Admin_Instructions', 'Engineer_Remarks']
    },
    {
      name: "System_Logs",
      headers: ['Log_ID', 'Timestamp', 'Actor_Email', 'Action_Type', 'Target_ID', 'Remarks']
    }
  ];

  schemas.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    
    // Create sheet if it does not exist
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }
    
    // Set/Update headers in Row 1
    const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
    headerRange.setValues([schema.headers]);
    
    // Formatting: Bold and freeze the header row
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
    
    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, schema.headers.length);
  });
  
  // Log configuration completion
  Logger.log("setupMasterDatabase execution complete: All 7 tables initialized.");
}

/**
 * Retained for legacy compatibility
 */
function initializeMasterDatabase() {
  setupMasterDatabase();
  try {
    SpreadsheetApp.getUi().alert("Database Initialization Complete: All 7 master tables and schemas have been successfully built.");
  } catch (e) {
    Logger.log("Database initialized successfully.");
  }
}
