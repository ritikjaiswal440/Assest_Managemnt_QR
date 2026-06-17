// BaseRepository.gs

/**
 * BaseRepository
 * An abstract database interaction layer enforcing the Repository pattern.
 * Uses UUIDs for identification. Explicitly forbids using sheet row numbers.
 */
class BaseRepository {
  /**
   * @param {string} sheetName - The base name of the sheet
   * @param {boolean} isSharded - Whether this table is sharded by year
   */
  constructor(sheetName, isSharded = false) {
    this.originalSheetName = sheetName;
    
    // Map abstract sheet name to actual spreadsheet sheet name
    let mappedName = sheetName;
    if (sheetName === 'Companies') mappedName = 'Company_Master';
    if (sheetName === 'Assets') mappedName = 'Asset_Master';
    
    this.sheetName = mappedName;
    this.isSharded = isSharded;
  }

  _getSheet() {
    if (this.isSharded) {
      return getShardedSheet(this.sheetName); // defaults to current year
    }
    return getSheet(this.sheetName);
  }

  /**
   * Maps database object to frontend property names
   */
  _dbToObj(sheetName, dbObj) {
    if (sheetName === 'Companies' || sheetName === 'Company_Master') {
      return {
        id: String(dbObj['Ref_Code'] || ''),
        name: dbObj['Company_Name'] || '',
        supportTier: dbObj['Support_Type'] || '',
        amcStart: dbObj['AMC_Start_Date'] || '',
        amcEnd: dbObj['AMC_End_Date'] || '',
        status: dbObj['Status'] || 'Active'
      };
    }
    if (sheetName === 'Assets' || sheetName === 'Asset_Master') {
      return {
        id: String(dbObj['Unique_Product_Id'] || ''),
        uuid: dbObj['uuid'] || String(dbObj['Unique_Product_Id'] || ''),
        refCode: String(dbObj['Ref_Code'] || ''),
        companyName: dbObj['Company_Name'] || '',
        location: dbObj['Location'] || '',
        roomName: dbObj['Room_Name'] || '',
        productMake: dbObj['ProductMake'] || '',
        productModel: dbObj['ProductModel'] || '',
        productSerial: dbObj['ProductSerial'] || '',
        subLocation: dbObj['Sub_Location'] || '',
        roomType: dbObj['Room_Type'] || '',
        floor: dbObj['Floor'] || '',
        warrantyStartDate: dbObj['Warranty_Start_Date'] || '',
        dlpPeriod: dbObj['DLP_Period'] || '',
        warrantyEndDate: dbObj['Warranty_End_Date'] || '',
        warrantyDaysLeft: dbObj['Warranty_Days_Left'] || '',
        macId: dbObj['MAC_ID'] || '',
        ipAddress: dbObj['IP_Address'] || '',
        salesOrder: dbObj['Sales_Order'] || '',
        invoiceNo: dbObj['Invoice_No'] || '',
        assetStatus: dbObj['Asset_Status'] || 'Active'
      };
    }
    if (sheetName === 'Asset_Complaints' || sheetName.startsWith('Asset_Complaints')) {
      return {
        id: String(dbObj['Complaint_ID'] || ''),
        assetId: String(dbObj['Unique_Product_Id'] || ''),
        refCode: String(dbObj['Ref_Code'] || ''),
        companyName: dbObj['Company_Name'] || '',
        clientName: dbObj['Requested_By'] || '',
        clientEmail: dbObj['Client_Email'] || '',
        phoneNumber: dbObj['PhoneNumber'] || '',
        description: dbObj['Description'] || '',
        billingFlag: dbObj['Support_Type'] || '',
        status: dbObj['Status'] || '',
        syncStatus: dbObj['Sync_Status'] || '',
        timestamp: dbObj['Created_At'] || '',
        serviceRequestNo: dbObj['Request_ID'] || '',
        parentTicketId: dbObj['Parent_Ticket_ID'] || '',
        assignedEngineer: dbObj['Assigned_Engineer'] || ''
      };
    }
    return dbObj;
  }

  /**
   * Maps frontend property names to database columns
   */
  _objToDb(sheetName, obj) {
    if (sheetName === 'Companies' || sheetName === 'Company_Master') {
      return {
        'Ref_Code': obj.id,
        'Company_Name': obj.name,
        'Support_Type': obj.supportTier,
        'AMC_Start_Date': obj.amcStart,
        'AMC_End_Date': obj.amcEnd,
        'Status': obj.status,
        'Created_At': obj.createdAt || new Date().toISOString()
      };
    }
    if (sheetName === 'Assets' || sheetName === 'Asset_Master') {
      return {
        'Unique_Product_Id': obj.id,
        'Ref_Code': obj.refCode,
        'Company_Name': obj.companyName,
        'Location': obj.location,
        'Room_Name': obj.roomName,
        'ProductMake': obj.productMake,
        'ProductModel': obj.productModel,
        'ProductSerial': obj.productSerial,
        'Sub_Location': obj.subLocation,
        'Room_Type': obj.roomType,
        'Floor': obj.floor,
        'Warranty_Start_Date': obj.warrantyStartDate,
        'DLP_Period': obj.dlpPeriod,
        'Warranty_End_Date': obj.warrantyEndDate,
        'Warranty_Days_Left': obj.warrantyDaysLeft,
        'MAC_ID': obj.macId,
        'IP_Address': obj.ipAddress,
        'Sales_Order': obj.salesOrder,
        'Invoice_No': obj.invoiceNo,
        'Asset_Status': obj.assetStatus,
        'Updated_At': new Date().toISOString()
      };
    }
    if (sheetName === 'Asset_Complaints' || sheetName.startsWith('Asset_Complaints')) {
      return {
        'Complaint_ID': obj.id,
        'Unique_Product_Id': obj.assetId,
        'Ref_Code': obj.refCode || '',
        'Company_Name': obj.companyName || '',
        'Requested_By': obj.clientName || '',
        'Client_Email': obj.clientEmail || '',
        'PhoneNumber': obj.phoneNumber || '',
        'Description': obj.description || '',
        'Support_Type': obj.billingFlag || '',
        'Status': obj.status || '',
        'Sync_Status': obj.syncStatus || '',
        'Created_At': obj.timestamp || new Date().toISOString(),
        'Request_ID': obj.serviceRequestNo || '',
        'Parent_Ticket_ID': obj.parentTicketId || '',
        'Assigned_Engineer': obj.assignedEngineer || ''
      };
    }
    return obj;
  }

  /**
   * Generates a v4 UUID
   */
  generateUUID() {
    return Utilities.getUuid();
  }

  /**
   * Maps an array of headers and an array of values to a JSON object
   */
  _mapRowToJSON(headers, rowValues) {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) { // Ignore empty header columns
        obj[header] = rowValues[index];
      }
    });
    return obj;
  }

  /**
   * Reads all records from the sheet and returns them as an array of JSON objects
   */
  findAll() {
    const sheet = this._getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) return []; // Empty or only headers
    
    const headers = values[0];
    const records = [];
    
    for (let i = 1; i < values.length; i++) {
      const dbObj = this._mapRowToJSON(headers, values[i]);
      records.push(this._dbToObj(this.originalSheetName, dbObj));
    }
    
    return records;
  }

  /**
   * Finds a single record by its UUID
   * @param {string} uuid - The unique identifier
   * @param {string} idColumnName - The header name for the ID column (default 'id')
   */
  findById(uuid, idColumnName = 'id') {
    const records = this.findAll();
    const record = records.find(r => r[idColumnName] === uuid);
    return record || null;
  }

  /**
   * Saves a new record or updates an existing one
   * DO NOT USE ROW NUMBERS as primary keys. Always search by UUID.
   */
  save(record, idColumnName = 'id') {
    const sheet = this._getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let headers = values[0];
    
    // Convert record from JS object to DB columns
    const dbRecord = this._objToDb(this.originalSheetName, record);
    
    // Map idColumnName to DB header name
    let dbIdColumnName = idColumnName;
    if (this.originalSheetName === 'Companies') dbIdColumnName = 'Ref_Code';
    if (this.originalSheetName === 'Assets') dbIdColumnName = 'Unique_Product_Id';
    if (this.originalSheetName === 'Asset_Complaints') dbIdColumnName = 'Complaint_ID';
    
    // If sheet is completely empty, we can't save without headers.
    if (!headers || headers.length === 0) {
      headers = Object.keys(dbRecord);
      if (!headers.includes(dbIdColumnName)) {
        headers.unshift(dbIdColumnName);
      }
      sheet.appendRow(headers);
    }
    
    // Ensure the record has an ID
    if (!dbRecord[dbIdColumnName]) {
      dbRecord[dbIdColumnName] = record[idColumnName] || this.generateUUID();
    }
    
    // Sync the id back to the original object
    record[idColumnName] = dbRecord[dbIdColumnName];

    const uuid = dbRecord[dbIdColumnName];
    const idIndex = headers.indexOf(dbIdColumnName);
    
    if (idIndex === -1) {
       throw new Error(`ID Column '${dbIdColumnName}' not found in headers.`);
    }

    // Check if ID exists (Update)
    for (let i = 1; i < values.length; i++) {
      if (values[i][idIndex] === uuid) {
        // Update existing row
        const updatedRow = headers.map(h => dbRecord[h] !== undefined ? dbRecord[h] : values[i][headers.indexOf(h)]);
        sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
        return this.findById(uuid, idColumnName);
      }
    }

    // If we reach here, ID wasn't found, insert new row
    const newRow = headers.map(h => dbRecord[h] !== undefined ? dbRecord[h] : "");
    sheet.appendRow(newRow);
    
    return this.findById(uuid, idColumnName);
  }

  /**
   * Deletes a record by UUID
   */
  deleteById(uuid, idColumnName = 'id') {
    const sheet = this._getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) return false;
    
    const headers = values[0];
    
    let dbIdColumnName = idColumnName;
    if (this.originalSheetName === 'Companies') dbIdColumnName = 'Ref_Code';
    if (this.originalSheetName === 'Assets') dbIdColumnName = 'Unique_Product_Id';
    if (this.originalSheetName === 'Asset_Complaints') dbIdColumnName = 'Complaint_ID';
    
    const idIndex = headers.indexOf(dbIdColumnName);
    
    if (idIndex === -1) return false;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][idIndex] === uuid) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    
    return false;
  }
}
