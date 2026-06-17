// analytics_controller.gs

/**
 * Endpoint Handler: getDashboardKPIs
 * Aggregates KPIs across Companies, Assets, and Complaints.
 */
function handleGetDashboardKPIs(params) {
  const assetRepo = new BaseRepository('Assets', false);
  const companyRepo = new BaseRepository('Companies', false);
  const complaintRepo = new BaseRepository('Asset_Complaints', true); // Sharded by Year

  const assets = assetRepo.findAll() || [];
  const companies = companyRepo.findAll() || [];
  const complaints = complaintRepo.findAll() || [];

  const filterLocation = params.location;
  const filterRoom = params.roomName;
  const filterCompany = params.companyName; // By refCode or CompanyName

  // Extract unique options for frontend dropdowns before filtering
  const uniqueCompanies = Array.from(new Set(assets.map(a => a.companyName).filter(Boolean))).sort();
  const uniqueLocations = Array.from(new Set(assets.map(a => a.location).filter(Boolean))).sort();
  const uniqueRooms = Array.from(new Set(assets.map(a => a.roomName).filter(Boolean))).sort();

  let filteredAssets = assets;

  // Apply filters if provided
  if (filterLocation) {
    filteredAssets = filteredAssets.filter(a => a.location === filterLocation);
  }
  if (filterRoom) {
    filteredAssets = filteredAssets.filter(a => a.roomName === filterRoom);
  }
  if (filterCompany) {
    filteredAssets = filteredAssets.filter(a => a.refCode === filterCompany || a.companyName === filterCompany);
  }

  // Pre-map Companies for easy lookup
  const companyMap = {};
  for (const c of companies) {
    companyMap[c.id] = c;
  }

  let metrics = {
    totalAssets: filteredAssets.length,
    activeWarrantyAssets: 0,
    comprehensiveAmcAssets: 0,
    nonComprehensiveAmcAssets: 0,
    expiredWarrantyAssets: 0,
    openComplaints: 0
  };

  const today = new Date();
  const expiringSoonAssets = []; // For deep-dive list (AMC Days < 30)

  // Calculate Asset KPIs
  for (const asset of filteredAssets) {
    const comp = companyMap[asset.refCode];
    let supportType = '';
    let isExpired = false;
    let daysLeft = 0;

    if (comp) {
      supportType = (comp.supportTier || '').toLowerCase();
      if (comp.amcEnd) {
        const endDate = new Date(comp.amcEnd);
        if (!isNaN(endDate.getTime())) {
          const diffTime = endDate.getTime() - today.getTime();
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) {
            isExpired = true;
          }
        } else {
          isExpired = true; // Default to expired if invalid date
        }
      } else {
        isExpired = true; // No AMC date provided
      }
    }

    if (isExpired || asset.assetStatus === 'Retired') {
      metrics.expiredWarrantyAssets++;
    } else {
      if (supportType.includes('comprehensive')) {
        metrics.comprehensiveAmcAssets++;
      } else if (supportType.includes('warranty')) {
        metrics.activeWarrantyAssets++;
      } else {
        metrics.nonComprehensiveAmcAssets++;
      }
      
      // Check for < 30 days left
      if (daysLeft >= 0 && daysLeft <= 30) {
        expiringSoonAssets.push({
          assetId: asset.id,
          companyName: asset.companyName,
          productMake: asset.productMake,
          productModel: asset.productModel,
          supportType: comp.supportTier,
          daysRemaining: daysLeft
        });
      }
    }
  }

  // Calculate Complaint KPIs
  // If filters are active, we must only count complaints matching the filtered assets
  const validAssetIds = new Set(filteredAssets.map(a => a.id));
  
  for (const complaint of complaints) {
    // Check if open
    if (complaint.syncStatus === 'Pending' || complaint.syncStatus === 'Failed' || (complaint.serviceRequestNo && complaint.serviceRequestNo.includes('Pending'))) {
      if (!filterLocation && !filterRoom && !filterCompany) {
         metrics.openComplaints++;
      } else if (validAssetIds.has(complaint.assetId)) {
         metrics.openComplaints++;
      }
    }
  }
  
  // Sort expiring soon list by urgency
  expiringSoonAssets.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    success: true,
    data: {
      metrics: metrics,
      expiringSoon: expiringSoonAssets,
      filterOptions: {
        companies: uniqueCompanies,
        locations: uniqueLocations,
        rooms: uniqueRooms
      }
    }
  };
}

/**
 * Endpoint Handler: getFailureTrends
 * Computes failure frequencies to flag hardware lines with high failure rates.
 */
function handleGetFailureTrends(params) {
  const assetRepo = new BaseRepository('Assets', false);
  const complaintRepo = new BaseRepository('Asset_Complaints', true);

  const assets = assetRepo.findAll() || [];
  const complaints = complaintRepo.findAll() || [];

  const filterLocation = params.location;
  const filterRoom = params.roomName;
  const filterCompany = params.companyName;

  // Pre-map Assets for fast lookup
  const assetMap = {};
  for (const a of assets) {
    if (filterLocation && a.location !== filterLocation) continue;
    if (filterRoom && a.roomName !== filterRoom) continue;
    if (filterCompany && a.refCode !== filterCompany && a.companyName !== filterCompany) continue;
    assetMap[a.id] = a;
  }

  // Group by ProductMake + ProductModel
  const failureCounts = {};

  for (const complaint of complaints) {
    const asset = assetMap[complaint.assetId];
    if (asset) {
      const key = `${asset.productMake || 'Unknown'} ${asset.productModel || 'Unknown'}`.trim();
      if (!failureCounts[key]) {
        failureCounts[key] = 0;
      }
      failureCounts[key]++;
    }
  }

  // Convert to array and sort
  const trends = Object.keys(failureCounts).map(key => {
    return {
      model: key,
      failures: failureCounts[key]
    };
  });

  trends.sort((a, b) => b.failures - a.failures);

  return {
    success: true,
    data: trends
  };
}
