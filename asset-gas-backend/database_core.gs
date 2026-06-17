// database_core.gs

/**
 * DB Configuration
 * The ID of the central Google Sheet used as the database.
 * IMPORTANT: Replace this with your actual Google Sheet ID.
 */
const DB_CONFIG = {
  SHEET_ID: "YOUR_GOOGLE_SHEET_ID_HERE" // TODO: Update with actual Sheet ID
};

/**
 * Connection Layer
 * Returns the main Spreadsheet object.
 */
function getSpreadsheet() {
  try {
    if (DB_CONFIG.SHEET_ID && DB_CONFIG.SHEET_ID !== "YOUR_GOOGLE_SHEET_ID_HERE") {
      return SpreadsheetApp.openById(DB_CONFIG.SHEET_ID);
    }
  } catch(e) {
    Logger.log("openById failed, falling back to active spreadsheet: " + e.message);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Sharding Helper
 * Retrieves a sheet by its base name, appending the current year or specified year to handle data sharding.
 * E.g., getShardedSheet("Complaints") might return the sheet named "Complaints_2024".
 */
function getShardedSheet(baseName, year = null) {
  const targetYear = year || new Date().getFullYear();
  const shardedName = `${baseName}_${targetYear}`;
  
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(shardedName);
  
  // Auto-create shard if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(shardedName);
  }
  
  return sheet;
}

/**
 * Get standard un-sharded sheet (e.g., for static tables like 'Assets' if not sharded)
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  // Auto-create standard sheet if it doesn't exist
  if (!sheet) {
    return ss.insertSheet(sheetName);
  }
  
  return sheet;
}
