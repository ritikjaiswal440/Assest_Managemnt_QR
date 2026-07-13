/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { assetApi, fetchAssets, fetchMasterTickets, getDashboard } from '../../services/apiClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import './ReportingDashboard.css';

export default function ReportingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [kpiMetrics, setKpiMetrics] = useState({
    totalAssets: 0, activeWarrantyAssets: 0, comprehensiveAmcAssets: 0,
    dlpAssets: 0, expiredAssets: 0, openComplaints: 0
  });

  const [categoryTrends, setCategoryTrends] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ brands: [], companies: [], locations: [], rooms: [] });
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [engineerTasks, setEngineerTasks] = useState([]);
  const [kpiDrillDown, setKpiDrillDown] = useState(null);
  const [drillDownSO, setDrillDownSO] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [healthDrillDownTier, setHealthDrillDownTier] = useState(null);
  const [chartDrillDown, setChartDrillDown] = useState(null);

  // Global Time Filters
  const currentYear = new Date().getFullYear().toString();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('ALL');

  // Comprehensive Filter State
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', brand: '',
    companyName: '', location: '', roomName: ''
  });

  // UTILITY: Smart CSV Exporter (Handles both Assets and Tickets)
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const isTicketData = data[0].hasOwnProperty('Ticket_ID');

    let headers = [];
    let rows = [];

    if (isTicketData) {
      headers = ['Ticket ID', 'Category', 'Issue', 'Make', 'Company', 'Open Date', 'Status'];
      rows = data.map(t => {
        const linkedAsset = assets?.find(a => a.Ref_Code === t.Asset_Ref_Code) || {};
        return [
          t.Ticket_ID || '',
          t.Category || '',
          t.Issue_Type || t.Issue || '',
          linkedAsset.Make || linkedAsset.ProductMake || 'Unknown',
          t.Company_Name || '',
          t.Open_Date ? new Date(t.Open_Date).toLocaleDateString('en-GB') : '',
          t.Status || ''
        ];
      });
    } else {
      headers = ['Asset ID', 'Company', 'Branch', 'Make', 'Model', 'Serial No', 'Sales Order', 'Support Tier', 'OEM Warranty End'];
      rows = data.map(a => [
        a.Ref_Code || '',
        a.Company_Name || a.Company || '',
        a.Branch || '',
        a.Make || a.ProductMake || '',
        a.Model || a.ProductModel || '',
        a.Serial_No || a.ProductSerial || '',
        a.Sales_Order || '',
        getSupportTier(a),
        a.Warranty_End_Date ? new Date(a.Warranty_End_Date).toLocaleDateString('en-GB') : 'N/A'
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(e => `"${e.join('","')}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assetApi('getDashboardKPIs', filters);
      if (res && res.success && res.data) {
        setKpiMetrics(res.data.metrics || {});
        setCategoryTrends(res.data.categoryFailures || []);
        setBrandData(res.data.brandDistribution || []);
        setFilterOptions(res.data.filterOptions || { brands: [], companies: [], locations: [], rooms: [] });
      }

      const [assetsRes, ticketsRes, dashboardRes] = await Promise.all([
        fetchAssets(),
        fetchMasterTickets(),
        getDashboard()
      ]);

      if (assetsRes && assetsRes.success) {
        setAssets(assetsRes.data || []);
      }
      if (ticketsRes && ticketsRes.success) {
        setTickets(ticketsRes.data || []);
      }
      if (dashboardRes && dashboardRes.success && dashboardRes.data) {
        setEngineerTasks(dashboardRes.data.children || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', brand: '', companyName: '', location: '', branch: '', roomName: '' });
  };

  // Recharts Color Palette for Pie Chart
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#475569', '#0891b2', '#ea580c'];

  // 1. Derive branches based on the CURRENTLY selected company
  const uniqueBranches = useMemo(() => {
    let baseAssets = assets;
    if (filters.companyName) {
      baseAssets = baseAssets.filter(a => (a.Company_Name || a.companyName) === filters.companyName);
    }
    return [...new Set(baseAssets.map(a => a.Branch || a.branch).filter(Boolean))].sort();
  }, [assets, filters.companyName]);

  // 2. Clear the branch filter automatically if the user changes the company
  useEffect(() => {
    setFilters(prev => ({ ...prev, branch: '' }));
  }, [filters.companyName]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const brand = (asset.ProductMake || asset.Make || '').trim().toLowerCase();
      if (filters.brand && brand !== filters.brand.trim().toLowerCase()) return false;

      const comp = (asset.Company_Name || asset.companyName || '').trim().toLowerCase();
      if (filters.companyName && comp !== filters.companyName.trim().toLowerCase()) return false;

      const loc = (asset.Location || asset.location || '').trim().toLowerCase();
      if (filters.location && loc !== filters.location.trim().toLowerCase()) return false;

      const branch = (asset.Branch || asset.branch || '').trim().toLowerCase();
      if (filters.branch && branch !== filters.branch.trim().toLowerCase()) return false;

      const room = (asset.Room_Name || asset.roomName || '').trim().toLowerCase();
      if (filters.roomName && room !== filters.roomName.trim().toLowerCase()) return false;

      return true;
    });
  }, [assets, filters]);

  // 1. Support Tier calculation helper
  const getSupportTier = (asset) => {
    const now = new Date().getTime();
    const amcEnd = asset.AMC_End_Date || asset.amcEnd || asset.amcEndDate ? new Date(asset.AMC_End_Date || asset.amcEnd || asset.amcEndDate).getTime() : 0;
    const nonAmcEnd = asset.NON_CAMC_End_Date || asset.nonAmcEnd || asset.nonAmcEndDate ? new Date(asset.NON_CAMC_End_Date || asset.nonAmcEnd || asset.nonAmcEndDate).getTime() : 0;
    const dlpEnd = asset.DLP_End_Date || asset.dlpEnd || asset.dlpEndDate ? new Date(asset.DLP_End_Date || asset.dlpEnd || asset.dlpEndDate).getTime() : 0;

    if (!isNaN(dlpEnd) && dlpEnd >= now) return 'DLP';
    if (!isNaN(amcEnd) && amcEnd >= now) return 'Comprehensive AMC';
    if (!isNaN(nonAmcEnd) && nonAmcEnd >= now) return 'Non-Comprehensive AMC';
    return 'Out Of Support';
  };

  // UTILITY: Calculate days left
  const getDaysLeft = (endDateStr) => {
    if (!endDateStr) return null;
    const diff = new Date(endDateStr).getTime() - new Date().getTime();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : -1;
  };

  // UTILITY: Safe Date Parsers for Warranties
  const isWarrantyActive = (endDateStr) => {
    if (!endDateStr) return false;
    const end = new Date(endDateStr).getTime();
    return !isNaN(end) && end >= new Date().getTime();
  };

  const isWarrantyExpired = (endDateStr) => {
    if (!endDateStr) return false;
    const end = new Date(endDateStr).getTime();
    return !isNaN(end) && end < new Date().getTime();
  };
  // UTILITY: Checks if an asset is 100% Uncovered (No Warranty AND No AMC)
  const isCompletelyUncovered = (asset) => {
    const now = new Date().getTime();

    // 1. Check Service Contracts (AMC / DLP)
    const amcEndVal = asset.AMC_End_Date || asset.amcEnd || asset.amcEndDate;
    const nonAmcEndVal = asset.NON_CAMC_End_Date || asset.nonAmcEnd || asset.nonAmcEndDate;
    const dlpEndVal = asset.DLP_End_Date || asset.dlpEnd || asset.dlpEndDate;

    const amcEnd = amcEndVal ? new Date(amcEndVal).getTime() : 0;
    const nonAmcEnd = nonAmcEndVal ? new Date(nonAmcEndVal).getTime() : 0;
    const dlpEnd = dlpEndVal ? new Date(dlpEndVal).getTime() : 0;

    const hasActiveContract = (!isNaN(amcEnd) && amcEnd >= now) ||
      (!isNaN(nonAmcEnd) && nonAmcEnd >= now) ||
      (!isNaN(dlpEnd) && dlpEnd >= now);

    // 2. Check OEM Warranty
    const warrantyEndVal = asset.Warranty_End_Date || asset.warrantyEndDate;
    const warrantyEnd = warrantyEndVal ? new Date(warrantyEndVal).getTime() : 0;
    const hasActiveWarranty = (!isNaN(warrantyEnd) && warrantyEnd >= now);

    // Asset is ONLY expired if it lacks BOTH protections
    return !hasActiveContract && !hasActiveWarranty;
  };

  const expiringContracts = useMemo(() => {
    if (!filteredAssets || filteredAssets.length === 0) return [];

    // Group assets by SO
    const uniqueSOs = new Map();
    filteredAssets.forEach(asset => {
      const so = asset.Sales_Order || asset.salesOrder;
      if (so) {
        uniqueSOs.set(so, asset);
      }
    });

    let alerts = [];
    uniqueSOs.forEach((so, soKey) => {
      const dlpStart = so.DLP_Start_Date || so.dlpStartDate;
      const dlpEnd = so.DLP_End_Date || so.dlpEndDate;
      const amcStart = so.AMC_Start_Date || so.amcStartDate;
      const amcEnd = so.AMC_End_Date || so.amcEndDate;
      const nonAmcStart = so.NON_CAMC_Start_Date || so.nonAmcStartDate;
      const nonAmcEnd = so.NON_CAMC_End_Date || so.nonAmcEndDate;
      const compName = so.Company_Name || so.companyName;
      const branchName = so.Branch || so.branch;

      const dlpDays = getDaysLeft(dlpEnd);
      if (dlpDays !== null && dlpDays >= 0 && dlpDays <= 90) {
        alerts.push({ company: compName, branch: branchName, so: soKey, tier: 'DLP', daysLeft: dlpDays, date: dlpEnd });
      }

      const amcDays = getDaysLeft(amcEnd);
      if (amcDays !== null && amcDays >= 0 && amcDays <= 90) {
        alerts.push({ company: compName, branch: branchName, so: soKey, tier: 'Comprehensive AMC', daysLeft: amcDays, date: amcEnd });
      }

      const nonAmcDays = getDaysLeft(nonAmcEnd);
      if (nonAmcDays !== null && nonAmcDays >= 0 && nonAmcDays <= 90) {
        alerts.push({ company: compName, branch: branchName, so: soKey, tier: 'Non-Comprehensive AMC', daysLeft: nonAmcDays, date: nonAmcEnd });
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [filteredAssets]);

  const filteredTickets = useMemo(() => {
    return engineerTasks.map(task => {
      const parentTicket = tickets.find(t => String(t.Ticket_ID).trim().toLowerCase() === String(task.Ticket_ID_Ref).trim().toLowerCase());

      const linkedAsset = assets?.find(a => {
        const aRef = a.Unique_Product_Id || a.id || a.Ref_Code;
        const tRef = parentTicket?.Asset_Ref_Code || parentTicket?.Unique_Product_Id || parentTicket?.Asset_ID;
        return aRef && tRef && String(aRef).trim().toLowerCase() === String(tRef).trim().toLowerCase();
      });

      return {
        ...task,
        Company_Name: parentTicket?.Company_Name || parentTicket?.Company || '',
        Branch: parentTicket?.Branch || parentTicket?.branch || '',
        Room_Name: parentTicket?.Room_Name || parentTicket?.roomName || '',
        Unique_Product_Id: parentTicket?.Unique_Product_Id || parentTicket?.Asset_Ref_Code || '',
        ProductMake: linkedAsset?.ProductMake || linkedAsset?.Make || parentTicket?.ProductMake || parentTicket?.Make || '',
        ProductModel: linkedAsset?.ProductModel || linkedAsset?.Model || parentTicket?.ProductModel || parentTicket?.Model || '',
        Open_Date: task.Assigned_Date || parentTicket?.Open_Date || parentTicket?.Created_At || '',
        Admin_Remarks: task.Instructions || parentTicket?.Admin_Remarks || parentTicket?.Description || ''
      };
    }).filter(task => {
      // 1. Company Filter
      const comp = task.Company_Name.trim().toLowerCase();
      if (filters.companyName && comp !== filters.companyName.trim().toLowerCase()) return false;

      // 2. Branch Filter
      const branch = task.Branch.trim().toLowerCase();
      if (filters.branch && branch !== filters.branch.trim().toLowerCase()) return false;

      // 3. Room Filter
      const room = task.Room_Name.trim().toLowerCase();
      if (filters.roomName && room !== filters.roomName.trim().toLowerCase()) return false;

      // 4. Start/End dates based on Task's Assigned_Date
      if (filters.startDate || filters.endDate) {
        const createdDate = task.Assigned_Date || task.Closed_Date || task.Open_Date;
        if (createdDate) {
          const dateVal = new Date(createdDate);
          if (filters.startDate && dateVal < new Date(filters.startDate)) return false;
          if (filters.endDate && dateVal > new Date(filters.endDate)) return false;
        }
      }
      return true;
    });
  }, [engineerTasks, tickets, assets, filters]);

  // 1. ENGINE: Time-Filtered Engineer Tasks
  const timeFilteredTasks = useMemo(() => {
    if (!engineerTasks) return [];

    return engineerTasks.map(task => {
      const parentTicket = tickets.find(t => String(t.Ticket_ID).trim().toLowerCase() === String(task.Ticket_ID_Ref).trim().toLowerCase());

      const linkedAsset = assets?.find(a => {
        const aRef = a.Unique_Product_Id || a.id || a.Ref_Code;
        const tRef = parentTicket?.Asset_Ref_Code || parentTicket?.Unique_Product_Id || parentTicket?.Asset_ID;
        return aRef && tRef && String(aRef).trim().toLowerCase() === String(tRef).trim().toLowerCase();
      });

      return {
        ...task,
        Company_Name: parentTicket?.Company_Name || parentTicket?.Company || '',
        Branch: parentTicket?.Branch || parentTicket?.branch || '',
        Room_Name: parentTicket?.Room_Name || parentTicket?.roomName || '',
        Unique_Product_Id: parentTicket?.Unique_Product_Id || parentTicket?.Asset_Ref_Code || '',
        ProductMake: linkedAsset?.ProductMake || linkedAsset?.Make || parentTicket?.ProductMake || parentTicket?.Make || '',
        ProductModel: linkedAsset?.ProductModel || linkedAsset?.Model || parentTicket?.ProductModel || parentTicket?.Model || '',
        Open_Date: task.Assigned_Date || parentTicket?.Open_Date || parentTicket?.Created_At || '',
        Admin_Remarks: task.Instructions || parentTicket?.Admin_Remarks || parentTicket?.Description || ''
      };
    }).filter(task => {
      // PURGE: Explicitly ignore any legacy tasks stuck in 'Resolved' status
      if (task.Status === 'Resolved') return false;

      // 1. Company Filter
      const comp = task.Company_Name.trim().toLowerCase();
      if (filters.companyName && comp !== filters.companyName.trim().toLowerCase()) return false;

      // 2. Branch Filter
      const branch = task.Branch.trim().toLowerCase();
      if (filters.branch && branch !== filters.branch.trim().toLowerCase()) return false;

      // 3. Room Filter
      const room = task.Room_Name.trim().toLowerCase();
      if (filters.roomName && room !== filters.roomName.trim().toLowerCase()) return false;

      // 4. Start/End dates based on Task's Assigned_Date
      if (filters.startDate || filters.endDate) {
        const createdDate = task.Assigned_Date || task.Closed_Date || task.Open_Date;
        if (createdDate) {
          const dateVal = new Date(createdDate);
          if (filters.startDate && dateVal < new Date(filters.startDate)) return false;
          if (filters.endDate && dateVal > new Date(filters.endDate)) return false;
        }
      }

      // Fallback to whichever column name your DB uses for assignment date
      const dateString = task.Date || task.Date_Assigned || task.Assigned_Date || task.Created_At || task.Open_Date;
      if (!dateString) return false;

      const tDate = new Date(dateString);
      const tYear = tDate.getFullYear().toString();
      const tMonth = (tDate.getMonth() + 1).toString();

      if (filterYear !== 'ALL' && tYear !== filterYear) return false;
      if (filterMonth !== 'ALL' && tMonth !== filterMonth) return false;

      return true;
    });
  }, [engineerTasks, tickets, assets, filters, filterYear, filterMonth]);

  const timeFilteredTickets = timeFilteredTasks;

  // 2. Data: Pie Chart (Monthly Issues from Tasks)
  const issuePieData = useMemo(() => {
    const counts = {};
    timeFilteredTasks.forEach(task => {
      const issue = task.Issue || task.Issue_Type || 'Uncategorized';
      counts[issue] = (counts[issue] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [timeFilteredTasks]);

  // 3. Data: Volume Bar Graph (Tasks over Time)
  const volumeBarData = useMemo(() => {
    const counts = {};
    timeFilteredTasks.forEach(task => {
      const d = new Date(task.Date || task.Date_Assigned || task.Assigned_Date || task.Created_At || task.Open_Date);
      const key = filterMonth === 'ALL'
        ? d.toLocaleString('default', { month: 'short' })
        : d.getDate().toString();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ time: key, count: counts[key] }));
  }, [timeFilteredTasks, filterMonth]);

  // 4. ENGINE: Dispatch Categories & Repeat Failures (Time-Series)
  const dispatchBreakdownData = useMemo(() => {
    if (!engineerTasks || !tickets) return [];

    const timeMap = {};
    const historicalTracker = new Set(); // Tracks "Asset_Ref_Code + Issue"

    // 1. Sort all tasks chronologically so repeats are calculated in the correct order
    const sortedTasks = [...engineerTasks].sort((a, b) => {
      const d1 = new Date(a.Date || a.Date_Assigned || a.Assigned_Date || a.Created_At || 0);
      const d2 = new Date(b.Date || b.Date_Assigned || b.Assigned_Date || b.Created_At || 0);
      return d1 - d2;
    });

    sortedTasks.forEach(task => {
      // Find the linked ticket to get the Asset ID
      const linkedTicket = tickets.find(t =>
        String(t.Ticket_ID).trim().toLowerCase() === String(task.Ticket_ID_Ref || task.Ticket_ID).trim().toLowerCase()
      );
      const assetId = linkedTicket?.Asset_Ref_Code || 'Unknown_Asset';
      const issue = task.Issue || task.Issue_Type || 'Unknown_Issue';

      // Calculate Repeat Status
      const trackingKey = `${assetId}-${issue}`;
      const isRepeat = historicalTracker.has(trackingKey);
      historicalTracker.add(trackingKey); // Mark as seen for future iterations

      // 2. Apply Global Time Filters (Only chart the tasks that fall in our selected window)
      const d = new Date(task.Date || task.Date_Assigned || task.Assigned_Date || task.Created_At);
      if (isNaN(d.getTime())) return;

      const tYear = d.getFullYear().toString();
      const tMonth = (d.getMonth() + 1).toString();

      if (filterYear !== 'ALL' && tYear !== filterYear) return;
      if (filterMonth !== 'ALL' && tMonth !== filterMonth) return;

      // 3. Group by Time (Month or Day)
      const timeKey = filterMonth === 'ALL'
        ? d.toLocaleString('default', { month: 'short' })
        : d.getDate().toString();

      if (!timeMap[timeKey]) {
        timeMap[timeKey] = { time: timeKey, resident: 0, field: 0, repeated: 0, closed: 0, pending: 0 };
      }

      // 4. Tally the metrics
      const role = (task.Engineer_Role || '').toLowerCase();
      if (role.includes('resident')) timeMap[timeKey].resident += 1;
      else if (role.includes('field')) timeMap[timeKey].field += 1;

      if (isRepeat) timeMap[timeKey].repeated += 1;

      if (task.Status === 'Closed') timeMap[timeKey].closed += 1;
      else timeMap[timeKey].pending += 1;
    });

    return Object.values(timeMap);
  }, [engineerTasks, tickets, filterYear, filterMonth]);

  // 5. ENGINE: Total Tickets vs. Brand Breakdown (Time-Series)
  const { brandTrendData, uniqueBrands } = useMemo(() => {
    if (!tickets || tickets.length === 0) return { brandTrendData: [], uniqueBrands: [] };

    const timeMap = {};
    const brandSet = new Set();

    tickets.forEach(ticket => {
      if (!ticket.Open_Date) return;

      // 1. Apply Global Time Filters
      const d = new Date(ticket.Open_Date);
      const tYear = d.getFullYear().toString();
      const tMonth = (d.getMonth() + 1).toString();

      if (filterYear !== 'ALL' && tYear !== filterYear) return;
      if (filterMonth !== 'ALL' && tMonth !== filterMonth) return;

      const timeKey = filterMonth === 'ALL'
        ? d.toLocaleString('default', { month: 'short' })
        : d.getDate().toString();

      // 2. Cross-reference Asset to find the Brand/Make
      const linkedAsset = assets?.find(a => a.Ref_Code === ticket.Asset_Ref_Code) || ticket;
      const brand = linkedAsset.Make || linkedAsset.ProductMake || 'Unknown';
      brandSet.add(brand);

      // 3. Initialize the time period if it doesn't exist
      if (!timeMap[timeKey]) {
        timeMap[timeKey] = { time: timeKey, totalTickets: 0 };
      }

      // 4. Tally the Total Tickets and the specific Brand count
      timeMap[timeKey].totalTickets += 1;
      timeMap[timeKey][brand] = (timeMap[timeKey][brand] || 0) + 1;
    });

    return {
      brandTrendData: Object.values(timeMap),
      uniqueBrands: Array.from(brandSet)
    };
  }, [tickets, assets, filterYear, filterMonth]);

  // 6. Data: Category Line Graph over Time (Sourced from Tasks)
  const categoryLineData = useMemo(() => {
    const timeMap = {};
    timeFilteredTasks.forEach(task => {
      const d = new Date(task.Date || task.Date_Assigned || task.Assigned_Date || task.Created_At || task.Open_Date);
      const timeKey = filterMonth === 'ALL' ? d.toLocaleString('default', { month: 'short' }) : d.getDate().toString();

      // Pull Category directly from the enriched Task row
      const cat = task.Category || 'Other';

      if (!timeMap[timeKey]) timeMap[timeKey] = { time: timeKey };
      timeMap[timeKey][cat] = (timeMap[timeKey][cat] || 0) + 1;
    });
    return Object.values(timeMap);
  }, [timeFilteredTasks, filterMonth]);

  const categoryLineCategories = useMemo(() => {
    const cats = new Set();
    timeFilteredTasks.forEach(task => {
      cats.add(task.Category || 'Other');
    });
    return Array.from(cats);
  }, [timeFilteredTasks]);

  // --- BASE ENGINE: Active Master Tickets (Filtered by Time & Open Status) ---
  const activeMasterTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(ticket => {
      // 1. Filter out closed tickets (We only want Active/Open)
      const status = (ticket.Status || '').toLowerCase().replace(/\s+/g, '');
      if (status.includes('close') || status.includes('resolve')) return false;

      // 2. Apply Global Time Filters
      if (ticket.Open_Date) {
        const d = new Date(ticket.Open_Date);
        const tYear = d.getFullYear().toString();
        const tMonth = (d.getMonth() + 1).toString();
        if (filterYear !== 'ALL' && tYear !== filterYear) return false;
        if (filterMonth !== 'ALL' && tMonth !== filterMonth) return false;
      }
      return true;
    });
  }, [tickets, filterYear, filterMonth]);

  // 1. Data: Hardware Failure Trends (By Category)
  const categoryTrendsData = useMemo(() => {
    const counts = {};
    activeMasterTickets.forEach(t => {
      const cat = t.Category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1); // For progress bar scaling
    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key], width: (counts[key] / max) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [activeMasterTickets]);

  // 2. Data: Asset Distribution by Brand (Cross-referenced with Assets)
  const brandPieData = useMemo(() => {
    const counts = {};
    activeMasterTickets.forEach(t => {
      const linkedAsset = assets?.find(a => a.Ref_Code === t.Asset_Ref_Code) || t;
      const make = linkedAsset.Make || linkedAsset.ProductMake || 'Unknown';
      counts[make] = (counts[make] || 0) + 1;
    });
    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .filter(item => item.value > 0);
  }, [activeMasterTickets, assets]);

  // 3. Data: Issue Type Breakdown
  const issueBreakdownData = useMemo(() => {
    const counts = {};
    activeMasterTickets.forEach(t => {
      const issue = t.Issue_Type || t.Issue || 'Uncategorized';
      counts[issue] = (counts[issue] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key], width: (counts[key] / max) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [activeMasterTickets]);

  // 10. Data: Engineer Performance by Workflow Status
  const engineerPerformanceData = useMemo(() => {
    if (!timeFilteredTasks || timeFilteredTasks.length === 0) return [];

    const engMap = {};

    timeFilteredTasks.forEach(task => {
      // Adjust the key below if your DB uses 'Assigned_To' instead of 'Engineer_Name'
      const engName = task.Engineer_Name || task.Assigned_To || 'Unassigned';

      if (!engMap[engName]) {
        engMap[engName] = {
          name: engName,
          'Assigned': 0,
          'Inprogress': 0,
          'Pending Parts': 0,
          'Closed': 0,
          total: 0
        };
      }

      // Sanitize status string for robust matching
      const status = (task.Status || '').toLowerCase().replace(/\s+/g, '');

      if (status.includes('assign')) {
        engMap[engName]['Assigned'] += 1;
      } else if (status.includes('progress')) {
        engMap[engName]['Inprogress'] += 1;
      } else if (status.includes('part') || status.includes('pending')) {
        engMap[engName]['Pending Parts'] += 1;
      } else if (status.includes('close') || status.includes('resolve')) {
        engMap[engName]['Closed'] += 1;
      }

      engMap[engName].total += 1;
    });

    // Convert to array and sort by total volume (descending)
    return Object.values(engMap).sort((a, b) => b.total - a.total);
  }, [timeFilteredTasks]);



  // 7. Data: Issue Types by Engineer Role (Resident vs Field)
  const engineerIssueData = useMemo(() => {
    const issueMap = {};

    timeFilteredTasks.forEach(t => {
      const issue = t.Issue || 'Uncategorized';
      const engType = (t.Engineer_Role || '').toLowerCase();

      // Initialize the issue category if it doesn't exist yet
      if (!issueMap[issue]) {
        issueMap[issue] = { issue: issue, resident: 0, field: 0 };
      }

      // Route the count to the correct engineer role
      if (engType.includes('resident')) {
        issueMap[issue].resident += 1;
      } else if (engType.includes('field')) {
        issueMap[issue].field += 1;
      }
    });

    // Convert the object to an array and sort by total volume (highest to lowest)
    return Object.values(issueMap).sort((a, b) => (b.resident + b.field) - (a.resident + a.field));
  }, [timeFilteredTasks]);

  // 8. Data: Failure Trends by Product Make (Sourced from Master_Tickets)
  const { makeTrendData, uniqueMakes } = useMemo(() => {
    if (!tickets || tickets.length === 0) return { makeTrendData: [], uniqueMakes: [] };

    const timeMap = {};
    const makesSet = new Set();

    tickets.forEach(ticket => {
      // 1. Apply Global Time Filters to Master Tickets
      if (!ticket.Open_Date) return;
      const d = new Date(ticket.Open_Date);
      const tYear = d.getFullYear().toString();
      const tMonth = (d.getMonth() + 1).toString();

      if (filterYear !== 'ALL' && tYear !== filterYear) return;
      if (filterMonth !== 'ALL' && tMonth !== filterMonth) return;

      // 2. Cross-reference Asset to find the Make
      const linkedAsset = assets?.find(a => a.Ref_Code === ticket.Asset_Ref_Code) || ticket;
      const make = linkedAsset.Make || linkedAsset.ProductMake || 'Unknown';
      makesSet.add(make);

      // 3. Group by Time (Month or Day)
      const timeKey = filterMonth === 'ALL'
        ? d.toLocaleString('default', { month: 'short' })
        : d.getDate().toString();

      if (!timeMap[timeKey]) timeMap[timeKey] = { time: timeKey };
      timeMap[timeKey][make] = (timeMap[timeKey][make] || 0) + 1;
    });

    return {
      makeTrendData: Object.values(timeMap),
      uniqueMakes: Array.from(makesSet)
    };
  }, [tickets, assets, filterYear, filterMonth]);

  // 9. Data: Ticket Status Distribution (Master Tickets)
  const statusDistributionData = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];

    // Initialize our buckets
    const counts = {
      'Open': 0,
      'In Progress': 0,
      'Ready To Close': 0,
      'Resolved / Closed': 0
    };

    tickets.forEach(ticket => {
      // 1. Apply Global Time Filters
      if (ticket.Open_Date) {
        const d = new Date(ticket.Open_Date);
        const tYear = d.getFullYear().toString();
        const tMonth = (d.getMonth() + 1).toString();
        if (filterYear !== 'ALL' && tYear !== filterYear) return;
        if (filterMonth !== 'ALL' && tMonth !== filterMonth) return;
      }

      // 2. Sanitize and group the statuses safely
      const status = (ticket.Status || '').toLowerCase().replace(/\s+/g, '');

      if (status.includes('open')) {
        counts['Open'] += 1;
      } else if (status.includes('inprogress') || status.includes('progress')) {
        counts['In Progress'] += 1;
      } else if (status.includes('ready')) {
        counts['Ready To Close'] += 1;
      } else if (status.includes('resolve') || status.includes('close')) {
        // Safely catches both "Resolved" and "Closed" 
        counts['Resolved / Closed'] += 1;
      }
    });

    // 3. Convert to array and filter out empty buckets for a cleaner chart
    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .filter(item => item.value > 0);
  }, [tickets, filterYear, filterMonth]);

  // 11. Data: Parent Ticket Volume (Sourced from Engineer_Tasks)
  const parentChildData = useMemo(() => {
    if (!timeFilteredTasks || timeFilteredTasks.length === 0) return [];

    const parentMap = {};

    timeFilteredTasks.forEach(task => {
      // Robustly catch the specific column name, handling potential spaces or underscores
      const parentId = task['Parent Ticket_ID_Ref'] || task.Parent_Ticket_ID_Ref || task.Parent_Ticket_ID;

      if (parentId && parentId.toString().trim() !== '') {
        if (!parentMap[parentId]) {
          parentMap[parentId] = { parentId: parentId, childCount: 0 };
        }
        parentMap[parentId].childCount += 1;
      }
    });

    // Convert to array, sort by highest volume of child tasks, and take the top 10
    return Object.values(parentMap)
      .sort((a, b) => b.childCount - a.childCount)
      .slice(0, 10);
  }, [timeFilteredTasks]);

  // 1. projectAssets: Assets linked to the selected Sales Order for drill-down modal
  const projectAssets = useMemo(() => {
    if (!drillDownSO) return [];
    return assets.filter(asset => {
      const soNum = asset.Sales_Order || asset.salesOrder;
      return String(soNum || '').trim().toLowerCase() === String(drillDownSO).trim().toLowerCase();
    });
  }, [assets, drillDownSO]);

  // 2. filteredModalAssets: projectAssets filtered by search input in the modal
  const filteredModalAssets = useMemo(() => {
    return projectAssets.filter(asset => {
      if (!modalSearchQuery) return true;
      const query = modalSearchQuery.toLowerCase();
      const assetId = asset.Unique_Product_Id || asset.id || asset.Ref_Code || '';
      const make = asset.ProductMake || asset.Make || '';
      const model = asset.ProductModel || asset.Model || '';
      const serial = asset.ProductSerial || asset.Serial_No || '';
      return (
        String(assetId).toLowerCase().includes(query) ||
        String(make).toLowerCase().includes(query) ||
        String(model).toLowerCase().includes(query) ||
        String(serial).toLowerCase().includes(query)
      );
    });
  }, [projectAssets, modalSearchQuery]);

  // 3. KPI: Completely Expired Assets Count (100% uncovered)
  const expiredAssetsCount = useMemo(() => {
    return filteredAssets.filter(a => isCompletelyUncovered(a)).length;
  }, [filteredAssets]);

  // 4. Contract Health Portfolio Counts (Mathematically Complete)
  const contractHealth = useMemo(() => {
    return {
      dlp: filteredAssets.filter(a => getSupportTier(a) === 'DLP').length,
      compAmc: filteredAssets.filter(a => getSupportTier(a) === 'Comprehensive AMC').length,
      nonCompAmc: filteredAssets.filter(a => getSupportTier(a) === 'Non-Comprehensive AMC').length,
      oemOnly: filteredAssets.filter(a => getSupportTier(a) === 'Out Of Support' && !isCompletelyUncovered(a)).length,
      expired: filteredAssets.filter(a => isCompletelyUncovered(a)).length
    };
  }, [filteredAssets]);

  // --- Centralized MODAL DATA ENGINE ---
  const modalData = useMemo(() => {
    if (!kpiDrillDown) return [];

    // 1. CHART DRILL-DOWNS (Tickets)
    if (typeof kpiDrillDown === 'string' && kpiDrillDown.startsWith('CHART_')) {
      const [chartType, clickedValue] = kpiDrillDown.split('|');

      if (chartType === 'CHART_BRAND') {
        return activeMasterTickets.filter(t => {
          const linkedAsset = assets?.find(a => a.Ref_Code === t.Asset_Ref_Code) || t;
          const make = linkedAsset.Make || linkedAsset.ProductMake || 'Unknown';
          return make === clickedValue;
        });
      }
      if (chartType === 'CHART_ISSUE') {
        return activeMasterTickets.filter(t => (t.Issue_Type || 'Uncategorized') === clickedValue);
      }
      if (chartType === 'CHART_CATEGORY') {
        return activeMasterTickets.filter(t => (t.Category || 'Uncategorized') === clickedValue);
      }
      if (chartType === 'CHART_STATUS') {
        return activeMasterTickets.filter(t => {
          const status = (t.Status || '').toLowerCase().replace(/\s+/g, '');
          if (clickedValue === 'Open') return status.includes('open');
          if (clickedValue === 'In Progress') return status.includes('progress');
          if (clickedValue === 'Ready To Close') return status.includes('ready');
          if (clickedValue === 'Resolved / Closed') return status.includes('close') || status.includes('resolve');
          return false;
        });
      }
      if (chartType === 'CHART_PARENT') {
        // Return tasks from Engineer_Tasks where the Parent ID matches the clicked bar
        return engineerTasks.filter(task => {
          const parentId = task['Parent Ticket_ID_Ref'] || task.Parent_Ticket_ID_Ref || task.Parent_Ticket_ID;
          return parentId === clickedValue;
        });
      }
    }

    // 1.5. COMPLAINTS (Tickets)
    if (kpiDrillDown === 'COMPLAINTS') {
      return filteredTickets.filter(t => {
        const s = String(t.Status || '').toLowerCase();
        return !s.includes('close');
      });
    }

    // 2. STANDARD KPI DRILL-DOWNS (Assets)
    if (kpiDrillDown === 'WARRANTY') return filteredAssets.filter(a => isWarrantyActive(a.Warranty_End_Date || a.warrantyEndDate));
    if (kpiDrillDown === 'WARRANTY_EXPIRED') return filteredAssets.filter(a => isWarrantyExpired(a.Warranty_End_Date || a.warrantyEndDate));
    if (kpiDrillDown === 'DLP') return filteredAssets.filter(a => getSupportTier(a) === 'DLP');
    if (kpiDrillDown === 'COMP_AMC') return filteredAssets.filter(a => getSupportTier(a) === 'Comprehensive AMC');
    if (kpiDrillDown === 'NON_COMP_AMC') return filteredAssets.filter(a => getSupportTier(a) === 'Non-Comprehensive AMC');
    if (kpiDrillDown === 'WARRANTY_NO_AMC') return filteredAssets.filter(a => getSupportTier(a) === 'Out Of Support' && !isCompletelyUncovered(a));
    if (kpiDrillDown === 'EXPIRED') return filteredAssets.filter(a => isCompletelyUncovered(a));

    return filteredAssets; // Default fallback
  }, [kpiDrillDown, filteredAssets, activeMasterTickets, assets, filteredTickets, tickets, filterYear, filterMonth, engineerTasks]);

  return (
    <div className="reporting-dashboard">
      <div className="dashboard-header">
        <h2>Analytics & Reporting Engine</h2>
      </div>

      {/* --- RESTORED TOP KPI CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>

        {/* 1. Total Managed Assets */}
        <div 
          onClick={() => setKpiDrillDown('TOTAL')} 
          style={{ background: '#f3e8ff', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', borderBottom: '4px solid #a855f7', transition: 'transform 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <h4 style={{ margin: 0, color: '#6b21a8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Managed Assets</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#7e22ce', fontSize: '2.5rem' }}>
            {filteredAssets.length}
          </h2>
        </div>

        {/* 2. Active DLP */}
        <div 
          onClick={() => setKpiDrillDown('DLP')} 
          style={{ background: '#e0f2fe', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', borderBottom: '4px solid #0284c7', transition: 'transform 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <h4 style={{ margin: 0, color: '#0369a1', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active DLP</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#0284c7', fontSize: '2.5rem' }}>
            {filteredAssets.filter(a => getSupportTier(a) === 'DLP').length}
          </h2>
        </div>

        {/* 3. Comprehensive AMC */}
        <div 
          onClick={() => setKpiDrillDown('COMP_AMC')} 
          style={{ background: '#dcfce7', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', borderBottom: '4px solid #22c55e', transition: 'transform 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <h4 style={{ margin: 0, color: '#15803d', fontSize: '0.8rem', textTransform: 'uppercase' }}>Comprehensive AMC</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#16a34a', fontSize: '2.5rem' }}>
            {filteredAssets.filter(a => getSupportTier(a) === 'Comprehensive AMC').length}
          </h2>
        </div>

        {/* 4. Non-Comprehensive AMC */}
        <div 
          onClick={() => setKpiDrillDown('NON_COMP_AMC')} 
          style={{ background: '#fffbeb', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', borderBottom: '4px solid #d97706', transition: 'transform 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <h4 style={{ margin: 0, color: '#b45309', fontSize: '0.8rem', textTransform: 'uppercase' }}>Non-Comprehensive AMC</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#d97706', fontSize: '2.5rem' }}>
            {filteredAssets.filter(a => getSupportTier(a) === 'Non-Comprehensive AMC').length}
          </h2>
        </div>

        {/* 5. Completely Uncovered */}
        <div 
          onClick={() => setKpiDrillDown('EXPIRED')} 
          style={{ background: '#fee2e2', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', borderBottom: '4px solid #ef4444', transition: 'transform 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <h4 style={{ margin: 0, color: '#991b1b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Completely Uncovered</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#dc2626', fontSize: '2.5rem' }}>
            {filteredAssets.filter(a => isCompletelyUncovered(a)).length}
          </h2>
        </div>

      </div>

      {/* ADVANCED GLOBAL FILTERS */}
      <div className="filter-controls md3-surface" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {/* Sleek Global Time Filters */}
        <div className="filter-group">
          <label>Year</label>
          <select className="md3-input" name="filterYear" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="ALL">All Time</option>
            {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
              const yr = (new Date().getFullYear() - i).toString();
              return <option key={yr} value={yr}>{yr}</option>;
            })}
          </select>
        </div>

        <div className="filter-group">
          <label>Month</label>
          <select className="md3-input" name="filterMonth" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="ALL">All Months</option>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
              <option key={idx} value={(idx + 1).toString()}>{m}</option>
            ))}
          </select>
        </div>

        <div className="filter-group"><label>Start Date</label><input type="date" className="md3-input" name="startDate" value={filters.startDate} onChange={handleFilterChange} /></div>
        <div className="filter-group"><label>End Date</label><input type="date" className="md3-input" name="endDate" value={filters.endDate} onChange={handleFilterChange} /></div>

        <div className="filter-group">
          <label>Brand / Make</label>
          <select className="md3-input" name="brand" value={filters.brand} onChange={handleFilterChange}>
            <option value="">All Brands</option>
            {(filterOptions.brands || []).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Company</label>
          <select className="md3-input" name="companyName" value={filters.companyName} onChange={handleFilterChange}>
            <option value="">All Companies</option>
            {(filterOptions.companies || []).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Branch / Location</label>
          <select className="md3-input" name="branch" value={filters.branch} onChange={handleFilterChange}>
            <option value="">All Branches</option>
            {uniqueBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Room Name</label>
          <select className="md3-input" name="roomName" value={filters.roomName} onChange={handleFilterChange}>
            <option value="">All Rooms</option>
            {(filterOptions.rooms || []).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      {/* --- CONTRACT HEALTH PORTFOLIO --- */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1 }}>
        <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Contract Health Portfolio</h4>
        <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Overall status of managed infrastructure</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* 1. Active DLP */}
          <div
            onClick={() => setKpiDrillDown('DLP')}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f0f9ff', borderLeft: '4px solid #0369a1', borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontWeight: 'bold', color: '#0c4a6e', fontSize: '0.9rem' }}>Active DLP (New Projects)</span>
            <span style={{ fontWeight: '900', color: '#0369a1', fontSize: '1.1rem' }}>{contractHealth.dlp}</span>
          </div>

          {/* 2. Comprehensive AMC */}
          <div
            onClick={() => setKpiDrillDown('COMP_AMC')}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f0fdf4', borderLeft: '4px solid #166534', borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontWeight: 'bold', color: '#14532d', fontSize: '0.9rem' }}>Comprehensive AMC</span>
            <span style={{ fontWeight: '900', color: '#15803d', fontSize: '1.1rem' }}>{contractHealth.compAmc}</span>
          </div>

          {/* 3. Non-Comprehensive AMC */}
          <div
            onClick={() => setKpiDrillDown('NON_COMP_AMC')}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#fffbeb', borderLeft: '4px solid #b45309', borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontWeight: 'bold', color: '#78350f', fontSize: '0.9rem' }}>Non-Comprehensive AMC</span>
            <span style={{ fontWeight: '900', color: '#b45309', fontSize: '1.1rem' }}>{contractHealth.nonCompAmc}</span>
          </div>

          {/* 4. OEM Warranty Only (No AMC) */}
          <div
            onClick={() => setKpiDrillDown('WARRANTY_NO_AMC')}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontWeight: 'bold', color: '#4c1d95', fontSize: '0.9rem' }}>OEM Warranty Only (No AMC)</span>
            <span style={{ fontWeight: '900', color: '#7c3aed', fontSize: '1.1rem' }}>{contractHealth.oemOnly}</span>
          </div>

          {/* 5. Expired / Uncovered */}
          <div
            onClick={() => setKpiDrillDown('EXPIRED')}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.2s', marginTop: '12px' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontWeight: 'bold', color: '#7f1d1d', fontSize: '0.9rem' }}>Completely Uncovered</span>
            <span style={{ fontWeight: '900', color: '#dc2626', fontSize: '1.1rem' }}>{contractHealth.expired}</span>
          </div>

        </div>
      </div>

      {/* --- TOP SUMMARY CARDS (Active Master Tickets) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* Card 1: Hardware Failure Trends */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem', marginBottom: '4px' }}>Hardware Failure Trends</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 0, marginBottom: '20px' }}>Volume of active tickets by category</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
            {categoryTrendsData.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No active tickets.</span>}
            {categoryTrendsData.map((item, i) => (
              <div
                key={i}
                onClick={() => setKpiDrillDown(`CHART_CATEGORY|${item.name}`)}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 0.7}
                onMouseOut={(e) => e.currentTarget.style.opacity = 1}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                  <span>{item.name}</span>
                  <span style={{ color: '#8b5cf6' }}>{item.value}</span>
                </div>
                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px' }}>
                  <div style={{ width: `${item.width}%`, background: '#8b5cf6', height: '100%', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Asset Distribution by Brand (Fixed Pie Chart) */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem', marginBottom: '4px' }}>Asset Distribution by Brand</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 0, marginBottom: '0px' }}>Proportion of managed hardware makes</p>

          <div style={{ width: '100%', height: '220px' }}>
            {brandPieData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandPieData}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                    onClick={(data) => setKpiDrillDown(`CHART_BRAND|${data.name}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {brandPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 3: Issue Type Breakdown */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem', marginBottom: '4px' }}>Issue Type Breakdown</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 0, marginBottom: '20px' }}>Volume of open tickets by category</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
            {issueBreakdownData.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No open issues.</span>}
            {issueBreakdownData.map((item, i) => (
              <div
                key={i}
                onClick={() => setKpiDrillDown(`CHART_ISSUE|${item.name}`)}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 0.7}
                onMouseOut={(e) => e.currentTarget.style.opacity = 1}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                  <span>{item.name}</span>
                  <span style={{ color: '#ef4444' }}>{item.value}</span>
                </div>
                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px' }}>
                  <div style={{ width: `${item.width}%`, background: '#ef4444', height: '100%', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>  {/* --- Engineer Performance (Full Workflow Stack) --- */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1' }}>
        <h3 style={{ marginTop: 0, color: '#334155', marginBottom: '4px' }}>Engineer Performance</h3>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
          Task volume broken down by current workflow status.
        </p>

        <div style={{ height: '380px', width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
          ) : engineerPerformanceData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={engineerPerformanceData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                {/* X and Y axes are swapped for horizontal bars */}
                <XAxis type="number" allowDecimals={false} style={{ fontSize: '0.8rem' }} />
                <YAxis type="category" dataKey="name" width={110} style={{ fontSize: '0.8rem', fontWeight: '500' }} />

                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '0.85rem' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />

                {/* Stacked Bars representing the workflow progression */}
                <Bar dataKey="Assigned" stackId="a" fill="#94a3b8" /> {/* Slate/Grey - Just assigned */}
                <Bar dataKey="Inprogress" name="In Progress" stackId="a" fill="#f59e0b" /> {/* Amber/Orange - Actively working */}
                <Bar dataKey="Pending Parts" stackId="a" fill="#ef4444" /> {/* Red - Blocked */}
                <Bar dataKey="Closed" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} /> {/* Green - Completed */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>


      <h3 style={{ margin: '32px 0 16px 0', color: '#0f172a' }}>Advanced Time-Filtered Analytics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>

        {/* CHART 1: Volume Trend (Bar Chart) */}
        <div className="chart-panel md3-surface" style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Ticket Volume Trend</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>
            {filterMonth === 'ALL' ? 'Volume of tickets by month' : 'Volume of tickets by day of the month'}
          </p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : volumeBarData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* --- Current Ticket Status Distribution (Donut Chart) --- */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
          <h3 style={{ marginTop: 0, color: '#334155', marginBottom: '4px' }}>Queue Status Lifecycle</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
            Real-time snapshot of master ticket progression.
          </p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : statusDistributionData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label
                    onClick={(data) => setKpiDrillDown(`CHART_STATUS|${data.name}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {statusDistributionData.map((entry, index) => {
                      // Contextual coloring for lifecycle urgency
                      let color = '#94a3b8'; // Default grey
                      if (entry.name === 'Open') color = '#ef4444'; // Red
                      else if (entry.name === 'In Progress') color = '#f59e0b'; // Amber/Orange
                      else if (entry.name === 'Ready To Close') color = '#3b82f6'; // Blue
                      else if (entry.name === 'Resolved / Closed') color = '#10b981'; // Green

                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* CHART 2: Issue Type Proportions (Pie Chart) */}
        <div className="chart-panel md3-surface" style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Issue Type Proportions</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Distribution of helpdesk ticket types</p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : issuePieData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={issuePieData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                    {issuePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 3: Category failure trends (Line Chart) */}
        <div className="chart-panel md3-surface" style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Category Failure Trends</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Ticket volume trends across failure categories</p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : categoryLineData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryLineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {categoryLineCategories.map((cat, index) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[index % COLORS.length]} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 4: Dispatch Categories & Repeat Failures (Stacked Bar Chart) */}
        <div className="chart-panel md3-surface" style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#334155', marginBottom: '4px' }}>Dispatch Categories & Repeat Failures</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>Analysis of engineer dispatch type and recurring calls</p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : dispatchBreakdownData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dispatchBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" style={{ fontSize: '0.8rem' }} />
                  <YAxis allowDecimals={false} style={{ fontSize: '0.8rem' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '0.85rem' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />

                  {/* stackId="a" forces the bars to stack on top of each other */}
                  <Bar dataKey="resident" name="Resident Eng" stackId="a" fill="#f97316" /> {/* Orange */}
                  <Bar dataKey="field" name="Field Eng" stackId="a" fill="#94a3b8" /> {/* Grey */}
                  <Bar dataKey="closed" name="Closed Tasks" stackId="b" fill="#eab308" /> {/* Yellow */}
                  <Bar dataKey="pending" name="Pending Tasks" stackId="b" fill="#3b82f6" /> {/* Blue */}
                  <Bar dataKey="repeated" name="Top Repeated Issues" stackId="c" fill="#22c55e" radius={[4, 4, 0, 0]} /> {/* Green */}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 5: Brand Ticket Distribution (Clustered Bar Chart) */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0, color: '#334155', marginBottom: '4px' }}>Top Brands Compared With Total Nos. Of Calls</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
            Chronological comparison of overall ticket volume against specific product manufacturers.
          </p>
          <div style={{ height: '350px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : brandTrendData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandTrendData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" style={{ fontSize: '0.8rem' }} />
                  <YAxis allowDecimals={false} style={{ fontSize: '0.8rem' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '0.85rem' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />

                  {/* Main Total Tickets Bar - Fixed blue to match your reference image */}
                  <Bar dataKey="totalTickets" name="Total Nos. of Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />

                  {/* Dynamically render clustered bars for each specific brand found in the data */}
                  {uniqueBrands.map((brand, index) => (
                    <Bar
                      key={brand}
                      dataKey={brand}
                      name={brand}
                      // Offsetting the color index by 1 so it doesn't duplicate the blue from Total Tickets
                      fill={COLORS[(index + 1) % COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* CHART 6: Issue Workload by Engineer Role (Clustered Bar Chart) */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0, color: '#334155' }}>Issue Types Resolved: Resident vs. Field</h3>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
          ) : engineerIssueData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={engineerIssueData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="issue" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                {/* The two bars render side-by-side automatically for each issue */}
                <Bar dataKey="resident" name="Resident Engineers" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="field" name="Field Engineers" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* --- Failure Trends by Product Make (Master Tickets) --- */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1', marginTop: '24px' }}>
          <h3 style={{ marginTop: 0, color: '#334155' }}>Hardware Failure Trends by Make (Master Log)</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '-10px', marginBottom: '16px' }}>
            Volume of total reported tickets grouped by hardware brand over time.
          </p>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
          ) : makeTrendData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={makeTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                {/* Dynamically render a line for every unique hardware brand found in the data */}
                {uniqueMakes.map((make, index) => (
                  <Line
                    key={make}
                    type="monotone"
                    dataKey={make}
                    name={make}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* --- Parent/Child Ticket Volume --- */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1', marginTop: '24px' }}>
          <h3 style={{ marginTop: 0, color: '#334155', marginBottom: '4px' }}>Master Incident Impact</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
            Top Parent tickets generating the highest volume of Child tickets.
          </p>

          <div style={{ width: '100%', height: '300px' }}>
            {parentChildData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No parent/child links detected.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parentChildData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="parentId" style={{ fontSize: '0.7rem' }} tick={{ fill: '#64748b' }} />
                  <YAxis allowDecimals={false} style={{ fontSize: '0.8rem' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />

                  <Bar
                    dataKey="childCount"
                    name="Linked Child Tickets"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => setKpiDrillDown(`CHART_PARENT|${data.parentId}`)}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>



      </div>



      {/* --- PROJECT HARDWARE INVENTORY MODAL --- */}
      {drillDownSO && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '900px', width: '95%', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Sales Order Details: <strong style={{ color: '#2563eb' }}>{drillDownSO}</strong></h3>
              <button onClick={() => { setDrillDownSO(null); setModalSearchQuery(''); }} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search assets inside this Sales Order..."
                className="md3-input"
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* Table */}
            <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px', color: '#475569' }}>ASSET ID / REF CODE</th>
                    <th style={{ padding: '12px', color: '#475569' }}>LOCATION / BRANCH</th>
                    <th style={{ padding: '12px', color: '#475569' }}>ROOM</th>
                    <th style={{ padding: '12px', color: '#475569' }}>PRODUCT & SERIAL</th>
                    <th style={{ padding: '12px', color: '#475569' }}>SUPPORT TIER</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalAssets.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No assets found.</td>
                    </tr>
                  ) : (
                    filteredModalAssets.map((asset, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold' }}>{asset.Unique_Product_Id || asset.Ref_Code || '-'}</td>
                        <td style={{ padding: '12px', color: '#334155' }}>
                          <div style={{ fontWeight: 'bold' }}>{asset.Company_Name || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{asset.Branch || '-'}</div>
                        </td>
                        <td style={{ padding: '12px', color: '#334155' }}>{asset.Room_Name || '-'}</td>
                        <td style={{ padding: '12px', color: '#334155' }}>
                          <div style={{ fontWeight: 'bold' }}>{asset.ProductMake} {asset.ProductModel}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SN: {asset.ProductSerial || '-'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold',
                            background: getSupportTier(asset) === 'DLP' ? '#e0f2fe' :
                              getSupportTier(asset) === 'Comprehensive AMC' ? '#dcfce7' :
                                getSupportTier(asset) === 'Non-Comprehensive AMC' ? '#fffbeb' : '#fee2e2',
                            color: getSupportTier(asset) === 'DLP' ? '#0369a1' :
                              getSupportTier(asset) === 'Comprehensive AMC' ? '#15803d' :
                                getSupportTier(asset) === 'Non-Comprehensive AMC' ? '#b45309' : '#dc2626'
                          }}>
                            {getSupportTier(asset)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="md3-btn md3-btn-primary" onClick={() => { setDrillDownSO(null); setModalSearchQuery(''); }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* --- REPAIRED DRILL-DOWN MODAL --- */}
      {kpiDrillDown && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '1100px', width: '95%', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>

            {/* 1. HEADER & DOWNLOAD BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>
                {kpiDrillDown === 'TOTAL' && 'All Managed Assets'}
                {kpiDrillDown === 'COMPLAINTS' && 'Active Helpdesk Tickets'}
                {kpiDrillDown === 'WARRANTY' && 'Assets Under Active OEM Warranty'}
                {kpiDrillDown === 'WARRANTY_EXPIRED' && 'Assets with Expired OEM Warranty'}
                {kpiDrillDown === 'DLP' && 'Active DLP (New Projects)'}
                {kpiDrillDown === 'COMP_AMC' && 'Comprehensive AMC'}
                {kpiDrillDown === 'NON_COMP_AMC' && 'Non-Comprehensive AMC'}
                {kpiDrillDown === 'WARRANTY_NO_AMC' && 'OEM Warranty Only (No AMC)'}
                {kpiDrillDown === 'EXPIRED' && 'Completely Uncovered / Expired'}
                {typeof kpiDrillDown === 'string' && kpiDrillDown.startsWith('CHART_PARENT|') ? `Child Tickets for Master Ticket: ${kpiDrillDown.split('|')[1]}` : (typeof kpiDrillDown === 'string' && kpiDrillDown.startsWith('CHART_') && `Filtered Data: ${kpiDrillDown.split('|')[1]}`)}
              </h3>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {/* RESTORED DOWNLOAD BUTTON: Passes the hoisted modalData array */}
                <button
                  onClick={() => exportToCSV(modalData, typeof kpiDrillDown === 'string' && kpiDrillDown.startsWith('CHART_') ? 'Chart_Export' : 'Asset_Export')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                  Export CSV
                </button>
                <button onClick={() => setKpiDrillDown(null)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            </div>

            {/* 2. TABLE WRAPPER */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>

                {/* DYNAMIC HEADERS: Detects if we are looking at Tickets or Assets */}
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    {(kpiDrillDown === 'COMPLAINTS' || (typeof kpiDrillDown === 'string' && kpiDrillDown.startsWith('CHART_'))) ? (
                      <>
                        <th style={{ padding: '12px', color: '#475569' }}>TICKET ID</th>
                        <th style={{ padding: '12px', color: '#475569' }}>ISSUE DETAILS</th>
                        <th style={{ padding: '12px', color: '#475569' }}>HARDWARE MAKE</th>
                        <th style={{ padding: '12px', color: '#475569' }}>COMPANY</th>
                        <th style={{ padding: '12px', color: '#475569' }}>OPEN DATE</th>
                        <th style={{ padding: '12px', color: '#475569' }}>STATUS</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '12px', color: '#475569' }}>ASSET ID</th>
                        <th style={{ padding: '12px', color: '#475569' }}>LOCATION</th>
                        <th style={{ padding: '12px', color: '#475569' }}>PRODUCT & SERIAL</th>
                        <th style={{ padding: '12px', color: '#475569' }}>SALES ORDER</th>
                        <th style={{ padding: '12px', color: '#475569' }}>WARRANTY STATUS</th>
                        <th style={{ padding: '12px', color: '#475569' }}>SUPPORT TIER</th>
                      </>
                    )}
                  </tr>
                </thead>

                {/* DYNAMIC BODY: Maps the hoisted modalData array */}
                <tbody>
                  {modalData.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No data found.</td></tr>
                  ) : (
                    modalData.map((item, i) => {
                      const isTicket = item.hasOwnProperty('Ticket_ID') || item.hasOwnProperty('Task_ID');

                      // RENDER TICKET/TASK ROW
                      if (isTicket) {
                        const ticketRef = item.Ticket_ID_Ref || item.Ticket_ID;
                        const parentTicket = tickets?.find(t => String(t.Ticket_ID).trim().toLowerCase() === String(ticketRef).trim().toLowerCase()) || {};
                        const linkedAsset = assets?.find(a => a.Ref_Code === (parentTicket.Asset_Ref_Code || item.Asset_Ref_Code || item.Unique_Product_Id)) || {};
                        const primaryId = item.Ticket_ID || item.Task_ID;
                        const company = item.Company_Name || parentTicket.Company_Name || item.Company || parentTicket.Company || '';
                        const dateVal = item.Open_Date || item.Date || item.Date_Assigned || item.Assigned_Date || parentTicket.Open_Date || '';
                        const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB') : '';

                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#3b82f6' }}>{item.Task_ID || item.Ticket_ID}</td>
                            <td style={{ padding: '12px', color: '#475569' }}>{item.Category || parentTicket.Category || 'Other'}<br /><span style={{ fontSize: '0.75rem' }}>{item.Issue_Type || item.Issue || parentTicket.Issue_Type || parentTicket.Issue || ''}</span></td>
                            <td style={{ padding: '12px', color: '#475569' }}>{linkedAsset.Make || linkedAsset.ProductMake || ''} {linkedAsset.Model || ''}</td>
                            <td style={{ padding: '12px', color: '#475569' }}>{company}</td>
                            <td style={{ padding: '12px', color: '#475569' }}>{formattedDate}</td>
                            <td style={{ padding: '12px', color: '#475569', fontWeight: 'bold' }}>{item.Status || 'Open'}</td>
                          </tr>
                        );
                      }

                      // RENDER ASSET ROW
                      const calculatedTier = getSupportTier(item);
                      const wEndDate = item.Warranty_End_Date || item.warrantyEndDate;
                      let warrantyDaysLeft = null;
                      if (wEndDate) {
                        const diff = new Date(wEndDate).getTime() - new Date().getTime();
                        warrantyDaysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
                      }

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 'bold' }}>{item.Ref_Code}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{item.Company_Name || item.Company}<br /><span style={{ fontSize: '0.75rem' }}>{item.Branch}</span></td>
                          <td style={{ padding: '12px', color: '#475569' }}>{item.Make} {item.Model}<br /><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SN: {item.Serial_No}</span></td>
                          <td style={{ padding: '12px', color: '#475569' }}>{item.Sales_Order}</td>
                          <td style={{ padding: '12px', color: '#334155', verticalAlign: 'top' }}>
                            {wEndDate ? (
                              <>
                                <div>{new Date(wEndDate).toLocaleDateString('en-GB')}</div>
                                <div style={{
                                  fontSize: '0.75rem', fontWeight: 'bold', marginTop: '2px',
                                  color: warrantyDaysLeft > 30 ? '#166534' : warrantyDaysLeft > 0 ? '#b45309' : '#991b1b'
                                }}>
                                  {warrantyDaysLeft > 0 ? `${warrantyDaysLeft} Days Left` : 'Expired'}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No Warranty Data</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.70rem',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                background:
                                  calculatedTier === 'Out Of Support' ? '#fee2e2' :
                                    calculatedTier === 'Comprehensive AMC' ? '#dcfce7' :
                                      calculatedTier === 'Non-Comprehensive AMC' ? '#fffbeb' : '#e0f2fe',
                                color:
                                  calculatedTier === 'Out Of Support' ? '#991b1b' :
                                    calculatedTier === 'Comprehensive AMC' ? '#15803d' :
                                      calculatedTier === 'Non-Comprehensive AMC' ? '#b45309' : '#0369a1'
                              }}>
                                {calculatedTier}
                              </span>
                              {(() => {
                                if (!isWarrantyActive(wEndDate)) return null;
                                return (
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.70rem',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    background: '#f3e8ff',
                                    color: '#6b21a8',
                                    border: '1px solid #e9d5ff'
                                  }}>
                                    OEM Warranty Active
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 3. FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setKpiDrillDown(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- CHART DRILL-DOWN MODAL --- */}
      {chartDrillDown && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', padding: '24px' }}>

            {/* Dynamic Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Ticket Analysis</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {chartDrillDown.filterType === 'ISSUE' && <>Tickets categorized as: <strong style={{ color: '#ef4444' }}>{chartDrillDown.value}</strong></>}
                  {chartDrillDown.filterType === 'ENGINEER' && <>Closed tickets handled by: <strong style={{ color: '#0369a1' }}>{chartDrillDown.value}</strong></>}
                  {chartDrillDown.filterType === 'CATEGORY' && <>Tickets under failure trend: <strong style={{ color: '#8b5cf6' }}>{chartDrillDown.value}</strong></>}
                </p>
              </div>
              <button onClick={() => setChartDrillDown(null)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Filtered Table */}
            <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px', color: '#475569' }}>TICKET ID</th>

                    {/* DYNAMIC HEADER: Changes based on the clicked graph */}
                    <th style={{ padding: '12px', color: '#475569' }}>
                      {chartDrillDown.filterType === 'CATEGORY' ? 'CATEGORY' :
                        chartDrillDown.filterType === 'ISSUE' ? 'ISSUE TYPE' : 'STATUS'}
                    </th>

                    <th style={{ padding: '12px', color: '#475569' }}>LOCATION</th>
                    <th style={{ padding: '12px', color: '#475569' }}>ASSET / DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.filter(t => {
                    const ticketStatus = t.Status || t.Ticket_Status || 'Open';
                    const engineerName = t.Assigned_Engineer || t.assignedEngineer || t.Engineer_Name || 'Unassigned';

                    // 1. ISSUE TYPE: Must match the issue AND strictly be an open/active ticket
                    if (chartDrillDown.filterType === 'ISSUE') {
                      const isActive = ticketStatus !== 'Closed';
                      return (t.Issue || 'Uncategorized') === chartDrillDown.value && isActive;
                    }

                    // 2. ENGINEER: Must match the engineer AND strictly be a completed ticket (since this tracks performance)
                    if (chartDrillDown.filterType === 'ENGINEER') {
                      const isCompleted = ticketStatus === 'Closed';
                      return engineerName === chartDrillDown.value && isCompleted;
                    }

                    // 3. CATEGORY: Must match the category AND strictly be an open/active ticket
                    if (chartDrillDown.filterType === 'CATEGORY') {
                      const isActive = ticketStatus !== 'Closed';
                      return (t.Category || 'Uncategorized') === chartDrillDown.value && isActive;
                    }

                    return false;
                  }).map((ticket, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>

                      {/* Ticket ID */}
                      <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold' }}>{ticket.Ticket_ID || '-'}</td>

                      {/* DYNAMIC DATA CELL: Shows only the relevant data point */}
                      <td style={{ padding: '12px' }}>
                        {chartDrillDown.filterType === 'CATEGORY' && (
                          <span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>{ticket.Category || ticket.category || '-'}</span>
                        )}
                        {chartDrillDown.filterType === 'ISSUE' && (
                          <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{ticket.Issue_Type || ticket.issueType || '-'}</span>
                        )}
                        {chartDrillDown.filterType === 'ENGINEER' && (
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold',
                            background: String(ticket.Status || '').toLowerCase().includes('closed') ? '#dcfce7' : '#fee2e2',
                            color: String(ticket.Status || '').toLowerCase().includes('closed') ? '#166534' : '#991b1b'
                          }}>
                            {ticket.Status || 'Open'}
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td style={{ padding: '12px', color: '#334155' }}>
                        <div style={{ fontWeight: 'bold' }}>{ticket.Company_Name || ticket.Company || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ticket.Branch || ticket.branch || '-'}</div>
                      </td>

                      {/* Details */}
                      <td style={{ padding: '12px', color: '#334155' }}>
                        <div style={{ fontWeight: 'bold' }}>{ticket.Unique_Product_Id || ticket.Asset_Ref_Code || 'General'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{(ticket.Admin_Remarks || ticket.Description || '').substring(0, 40)}...</div>
                      </td>

                    </tr>
                  ))}
                  {filteredTickets.filter(t => {
                    const ticketStatus = t.Status || t.Ticket_Status || 'Open';
                    const engineerName = t.Assigned_Engineer || t.assignedEngineer || t.Engineer_Name || 'Unassigned';

                    // 1. ISSUE TYPE: Must match the issue AND strictly be an open/active ticket
                    if (chartDrillDown.filterType === 'ISSUE') {
                      const isActive = ticketStatus !== 'Closed';
                      return (t.Issue || 'Uncategorized') === chartDrillDown.value && isActive;
                    }

                    // 2. ENGINEER: Must match the engineer AND strictly be a completed ticket (since this tracks performance)
                    if (chartDrillDown.filterType === 'ENGINEER') {
                      const isCompleted = ticketStatus === 'Closed';
                      return engineerName === chartDrillDown.value && isCompleted;
                    }

                    // 3. CATEGORY: Must match the category AND strictly be an open/active ticket
                    if (chartDrillDown.filterType === 'CATEGORY') {
                      const isActive = ticketStatus !== 'Closed';
                      return (t.Category || 'Uncategorized') === chartDrillDown.value && isActive;
                    }

                    return false;
                  }).length === 0 && (
                      <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No tickets found.</td></tr>
                    )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="md3-btn md3-btn-primary" onClick={() => setChartDrillDown(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

