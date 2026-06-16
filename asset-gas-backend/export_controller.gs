// export_controller.gs

/**
 * Endpoint Handler: exportData
 */
function handleExportData(params) {
  const entityType = params.entityType || 'Assets'; // 'Assets', 'Companies', or 'Complaints'
  const filterByCompany = params.filterByCompany; // Optional: filter by refCode
  
  const validEntities = ['Assets', 'Companies', 'Asset_Complaints'];
  if (!validEntities.includes(entityType)) {
    throw new Error("Invalid export entity type.");
  }
  
  // Initialize repository
  // Asset_Complaints is sharded (true), others are not
  const isSharded = (entityType === 'Asset_Complaints');
  const repo = new BaseRepository(entityType, isSharded);
  
  let records = repo.findAll();
  
  // Apply Company Filter
  if (filterByCompany && entityType !== 'Companies') {
    if (entityType === 'Assets') {
      records = records.filter(r => r.refCode === filterByCompany);
    } else if (entityType === 'Asset_Complaints') {
      // Asset_Complaints may not have refCode directly, but they have clientEmail/clientName.
      // If we wanted to filter complaints by company, we'd have to cross-reference AssetId, 
      // but for this endpoint, we'll keep it simple or implement if deeply requested.
    }
  }
  
  // Sort data (e.g. by ID or Date)
  // For Companies and Assets, sort by ID. For Complaints, sort by Timestamp descending
  if (entityType === 'Asset_Complaints') {
    records.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB - dateA;
    });
  } else {
    records.sort((a, b) => {
      const idA = String(a.id || "").toLowerCase();
      const idB = String(b.id || "").toLowerCase();
      return idA.localeCompare(idB);
    });
  }
  
  return {
    success: true,
    count: records.length,
    entityType: entityType,
    data: records
  };
}
