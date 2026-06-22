/**
 * Master Database Setup for Unified Architecture
 * Initializes the 7 core tables in a single Google Sheet.
 */
function initializeMasterDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define the master schemas for the Unified System
  const schemas = [
    {
      name: "System_Users",
      headers: ['Name', 'Email', 'Role', 'Password', 'Company_Name', 'Status', 'Last_Login']
    },
    {
      name: "Company_Master",
      headers: ['Ref_Code', 'Company_Name', 'Location', 'Branch', 'Support_Type', 'AMC_Start_Date', 'AMC_End_Date', 'Primary_Contact', 'Primary_Email', 'Primary_Phone', 'Status', 'Created_At']
    },
    {
      name: "Asset_Master",
      headers: ['Unique_Product_Id', 'Sales_Order', 'Invoice_No', 'Ref_Code', 'Company_Name', 'Location', 'Sub_Location', 'Room_Type', 'Floor', 'Room_Name', 'ProductMake', 'ProductModel', 'ProductSerial', 'MAC_ID', 'IP_Address', 'Warranty_Start_Date', 'DLP_Period', 'Warranty_End_Date', 'Warranty_Days_Left', 'Asset_Status', 'Created_At', 'Updated_At']
    },
    {
      name: "Intake_Queue",
      headers: ['Intake_ID', 'Source', 'Payload', 'Timestamp', 'Status', 'Assigned_To', 'Sync_Status', 'Request_ID']
    },
    {
      name: "Master_Tickets",
      headers: ['Ticket_ID', 'Intake_ID_Ref', 'Ref_Code', 'Company_Name', 'Location', 'Service_Type', 'Status', 'Assigned_Engineer', 'Open_Date', 'Close_Date', 'Resolved_Days', 'Admin_Remarks']
    },
    {
      name: "Engineer_Tasks",
      headers: ['Task_ID', 'Ticket_ID_Ref', 'Engineer_Name', 'Engineer_Email', 'Status', 'Assigned_Date', 'Closed_Date', 'Instructions', 'Engineer_Remarks']
    },
    {
      name: "System_Logs",
      headers: ['Log_ID', 'Timestamp', 'Actor_Email', 'Action_Type', 'Target_ID', 'Remarks']
    }
  ];

  // Iterate through schemas and build the sheets
  schemas.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }
    
    // Inject headers into Row 1 (Idempotent: only overwrites headers, leaves data intact)
    const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
    headerRange.setValues([schema.headers]);
    
    // Apply UI Formatting (Bold, Background, Frozen Row)
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f3f3"); // Light gray
    sheet.setFrozenRows(1);
    
    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, schema.headers.length);
  });
  
  // Optional: Rename the default "Sheet1" to something else or delete it if empty
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }

  // Notify the Admin if running from UI
  try {
    SpreadsheetApp.getUi().alert("Database Initialization Complete: All 7 master tables and schemas have been successfully built.");
  } catch (e) {
    Logger.log("Database Initialization Complete: All 7 master tables and schemas have been successfully built.");
  }
}
