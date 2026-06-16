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
    this.sheetName = sheetName;
    this.isSharded = isSharded;
  }

  _getSheet() {
    if (this.isSharded) {
      return getShardedSheet(this.sheetName); // defaults to current year
    }
    return getSheet(this.sheetName);
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
      records.push(this._mapRowToJSON(headers, values[i]));
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
    
    // If sheet is completely empty, we can't save without headers.
    if (!headers || headers.length === 0) {
      headers = Object.keys(record);
      if (!headers.includes(idColumnName)) {
        headers.unshift(idColumnName);
      }
      sheet.appendRow(headers);
    }
    
    // Ensure the record has an ID
    if (!record[idColumnName]) {
      record[idColumnName] = this.generateUUID();
    }

    const uuid = record[idColumnName];
    const idIndex = headers.indexOf(idColumnName);
    
    if (idIndex === -1) {
       throw new Error(`ID Column '${idColumnName}' not found in headers.`);
    }

    // Check if ID exists (Update)
    for (let i = 1; i < values.length; i++) {
      if (values[i][idIndex] === uuid) {
        // Update existing row
        const updatedRow = headers.map(h => record[h] !== undefined ? record[h] : values[i][headers.indexOf(h)]);
        sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
        return this.findById(uuid, idColumnName);
      }
    }

    // If we reach here, ID wasn't found, insert new row
    const newRow = headers.map(h => record[h] !== undefined ? record[h] : "");
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
    const idIndex = headers.indexOf(idColumnName);
    
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
