// import_controller.gs

/**
 * Normalizes string values (trims whitespace, converts to proper case based on field type).
 */
function normalizeString(val) {
  if (!val) return "";
  return String(val).trim();
}

/**
 * Normalizes dates to ISO 8601 strings.
 */
function normalizeDate(val) {
  if (!val) return "";
  const dateObj = new Date(val);
  if (isNaN(dateObj.getTime())) return normalizeString(val);
  return dateObj.toISOString();
}

/**
 * Calculates the next sequential Asset ID based on the highest existing index.
 * e.g., Returns 'AVD/PD/004312'
 */
function generateNextAssetId(allAssets) {
  const prefix = "AVD/PD/";
  let maxNum = 0;
  
  for (const asset of allAssets) {
    if (asset.id && asset.id.startsWith(prefix)) {
      const numPart = asset.id.substring(prefix.length);
      const parsedNum = parseInt(numPart, 10);
      if (!isNaN(parsedNum) && parsedNum > maxNum) {
        maxNum = parsedNum;
      }
    }
  }
  
  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(6, '0');
  return prefix + paddedNum;
}

/**
 * Endpoint Handler: importCompanies
 */
function handleImportCompanies(params) {
  const rows = params.rows || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No rows provided for import.");
  }
  
  const companyRepo = new BaseRepository('Companies', false);
  const existingCompanies = companyRepo.findAll();
  
  // Create a Set of existing composite keys (Ref_Code-Company_Name-Branch) for quick deduplication
  const existingKeys = new Set(existingCompanies.map(c => `${String(c.id).toLowerCase()}-${String(c.name).toLowerCase()}-${String(c.branch || '').toLowerCase()}`));
  
  let importedCount = 0;
  let skippedCount = 0;
  let skippedRows = [];
  
  const newCompaniesToInsert = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawRefCode = row.id || row.Ref_Code || row.refCode;
    
    if (!rawRefCode) {
      skippedCount++;
      skippedRows.push({ rowIndex: i, reason: "Missing Ref_Code / ID" });
      continue;
    }
    
    const normalizedRefCode = normalizeString(rawRefCode);
    const normalizedName = normalizeString(row.name || row.Company_Name || "");
    const normalizedBranch = normalizeString(row.branch || row.Branch || "");
    const lowerKey = `${normalizedRefCode.toLowerCase()}-${normalizedName.toLowerCase()}-${normalizedBranch.toLowerCase()}`;
    
    if (existingKeys.has(lowerKey)) {
      skippedCount++;
      skippedRows.push({ rowIndex: i, reason: `Duplicate Company: ${normalizedRefCode} - ${normalizedName} - ${normalizedBranch}` });
      continue;
    }
    
    // Normalize Data
    const newCompany = {
      id: normalizedRefCode,
      name: normalizedName,
      branch: normalizedBranch,
      supportTier: normalizeString(row.supportTier || row.Support_Type || ""),
      amcStart: normalizeDate(row.amcStart || row.AMC_Start_Date || ""),
      amcEnd: normalizeDate(row.amcEnd || row.AMC_End_Date || ""),
      nonAmcStart: normalizeDate(row.nonAmcStart || row.NON_CAMC_Start_Date || ""),
      nonAmcEnd: normalizeDate(row.nonAmcEnd || row.NON_CAMC_End_Date || ""),
      status: normalizeString(row.status || row.Status || "Active")
    };
    
    newCompaniesToInsert.push(newCompany);
    existingKeys.add(lowerKey); // Prevent duplicates within the same batch
  }
  
  // Write to database (Batch insert would be better, but we loop save for now with BaseRepository)
  for (const comp of newCompaniesToInsert) {
    companyRepo.save(comp, 'id');
    importedCount++;
  }
  
  return {
    success: true,
    message: `Import complete. Imported: ${importedCount}. Skipped: ${skippedCount}.`,
    stats: { importedCount, skippedCount, skippedRows }
  };
}

/**
 * Endpoint Handler: importAssets
 */
function handleImportAssets(params) {
  const rows = params.rows || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No rows provided for import.");
  }
  
  const assetRepo = new BaseRepository('Assets', false);
  const existingAssets = assetRepo.findAll();
  
  // Create a Set of existing ProductSerials for deduplication
  const existingSerials = new Set();
  for (const asset of existingAssets) {
    if (asset.productSerial) {
      existingSerials.add(String(asset.productSerial).toUpperCase().trim());
    }
  }
  
  let importedCount = 0;
  let skippedCount = 0;
  let skippedRows = [];
  
  const newAssetsToInsert = [];
  
  let currentAllAssets = [...existingAssets];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Deduplicate by Serial
    const rawSerial = row.productSerial || row.ProductSerial || row.Serial_Number || "";
    const normalizedSerial = normalizeString(rawSerial).toUpperCase();
    
    if (normalizedSerial && existingSerials.has(normalizedSerial)) {
      skippedCount++;
      skippedRows.push({ rowIndex: i, reason: `Duplicate Product Serial: ${normalizedSerial}` });
      continue;
    }
    
    // ID Generation
    let assetId = normalizeString(row.id || row.Unique_Product_Id || "");
    if (!assetId) {
      assetId = generateNextAssetId(currentAllAssets);
    }
    
    const newAsset = {
      id: assetId,
      uuid: Utilities.getUuid(),
      refCode: normalizeString(row.refCode || row.Ref_Code || row.Company_Ref || ""),
      companyName: normalizeString(row.companyName || row.Company_Name || ""),
      location: normalizeString(row.location || row.Location || ""),
      roomName: normalizeString(row.roomName || row.Room_Name || ""),
      productMake: normalizeString(row.productMake || row.ProductMake || ""),
      productModel: normalizeString(row.productModel || row.ProductModel || ""),
      productSerial: normalizedSerial,
      assetStatus: normalizeString(row.assetStatus || row.Asset_Status || "Active"),
      signature: 'auto_' + Utilities.getUuid().substring(0, 4) // Temporary fallback sig, though they should be generated on the fly via handleGenerateQRSig usually.
    };
    
    newAssetsToInsert.push(newAsset);
    currentAllAssets.push(newAsset);
    
    if (normalizedSerial) {
      existingSerials.add(normalizedSerial);
    }
  }
  
  for (const asset of newAssetsToInsert) {
    assetRepo.save(asset, 'id');
    importedCount++;
  }
  
  return {
    success: true,
    message: `Asset import complete. Imported: ${importedCount}. Skipped: ${skippedCount}.`,
    stats: { importedCount, skippedCount, skippedRows }
  };
}
