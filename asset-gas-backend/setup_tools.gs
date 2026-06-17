/**
 * Run this function ONCE to initialize the Google Sheet database.
 * It will create the necessary sheets and format the header rows.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define the master schemas for the Asset System
  const schemas = [
    {
      name: "Company_Master",
      headers: [
        "Ref_Code", "Company_Name", "Support_Type", "AMC_Start_Date", 
        "AMC_End_Date", "Primary_Contact", "Primary_Email", 
        "Primary_Phone", "Status", "Created_At"
      ]
    },
    {
      name: "Asset_Master",
      headers: [
        "Unique_Product_Id", "Sales_Order", "Invoice_No", "Ref_Code", 
        "Company_Name", "Location", "Sub_Location", "Room_Type", 
        "Floor", "Room_Name", "ProductMake", "ProductModel", 
        "ProductSerial", "MAC_ID", "IP_Address", "Warranty_Start_Date", 
        "DLP_Period", "Warranty_End_Date", "Warranty_Days_Left", 
        "Asset_Status", "Created_At", "Updated_At"
      ]
    },
    {
      name: "Asset_Complaints_2026",
      headers: [
        "Complaint_ID", "Unique_Product_Id", "Ref_Code", "Company_Name", 
        "Requested_By", "Client_Email", "PhoneNumber", "Description", 
        "Support_Type", "Status", "Sync_Status", "Created_At", 
        "Request_ID", "Parent_Ticket_ID", "Assigned_Engineer"
      ]
    },
    {
      name: "Activity_Log_2026",
      headers: [
        "Log_ID", "Entity_Type", "Entity_ID", "Action", 
        "Performed_By", "Timestamp", "Remarks"
      ]
    }
  ];

  // Iterate through schemas and build the sheets
  schemas.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }
    
    // Inject headers into Row 1
    const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
    headerRange.setValues([schema.headers]);
    
    // Apply UI Formatting (Bold, Background, Frozen Row)
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f1f3f4"); // Material Design Light Gray
    sheet.setFrozenRows(1);
    
    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, schema.headers.length);
  });
  
  // Optional: Rename the default "Sheet1" to something else or delete it if empty
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }

  // Notify the Admin
  SpreadsheetApp.getUi().alert("Database Initialization Complete: All master tables and schemas have been successfully built.");
}
