/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { assetApi, fetchAssets, fetchMasterTickets } from '../../services/apiClient';
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

      const [assetsRes, ticketsRes] = await Promise.all([
        fetchAssets(),
        fetchMasterTickets()
      ]);

      if (assetsRes && assetsRes.success) {
        setAssets(assetsRes.data || []);
      }
      if (ticketsRes && ticketsRes.success) {
        setTickets(ticketsRes.data || []);
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
    return tickets.filter(ticket => {
      // 1. Company Filter
      const comp = (ticket.Company_Name || ticket.companyName || '').trim().toLowerCase();
      if (filters.companyName && comp !== filters.companyName.trim().toLowerCase()) return false;

      // 2. Branch Filter
      const branch = (ticket.Branch || ticket.branch || '').trim().toLowerCase();
      if (filters.branch && branch !== filters.branch.trim().toLowerCase()) return false;

      // 3. Room Filter
      const room = (ticket.Room_Name || ticket.roomName || '').trim().toLowerCase();
      if (filters.roomName && room !== filters.roomName.trim().toLowerCase()) return false;

      // 4. Start/End dates based on Ticket's Open_Date or Created_At
      if (filters.startDate || filters.endDate) {
        const createdDate = ticket.Open_Date || ticket.openDate || ticket.Created_At;
        if (createdDate) {
          const dateVal = new Date(createdDate);
          if (filters.startDate && dateVal < new Date(filters.startDate)) return false;
          if (filters.endDate && dateVal > new Date(filters.endDate)) return false;
        }
      }
      return true;
    });
  }, [tickets, filters]);

  // timeFilteredTickets: Tickets filtered by selected Year and Month
  const timeFilteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const openDate = ticket.Open_Date || ticket.openDate || ticket.Created_At;
      if (!openDate) return false;
      const d = new Date(openDate);
      if (isNaN(d.getTime())) return false;
      
      const tYear = d.getFullYear().toString();
      const tMonth = (d.getMonth() + 1).toString();
      
      if (filterYear !== 'ALL' && tYear !== filterYear) return false;
      if (filterMonth !== 'ALL' && tMonth !== filterMonth) return false;
      return true;
    });
  }, [tickets, filterYear, filterMonth]);

  // 1. Pie Chart Data (Monthly Issue Breakdown)
  const monthlyIssueBreakdown = useMemo(() => {
    const counts = {};
    timeFilteredTickets.forEach(ticket => {
      const type = ticket.Issue_Type || ticket.issueType || ticket.IssueType || 'Uncategorized';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [timeFilteredTickets]);

  // 2. Bar Graph (Monthly/Daily Volume)
  const ticketVolumeData = useMemo(() => {
    if (filterMonth === 'ALL') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const counts = Array(12).fill(0);
      timeFilteredTickets.forEach(ticket => {
        const openDate = ticket.Open_Date || ticket.openDate || ticket.Created_At;
        if (!openDate) return;
        const d = new Date(openDate);
        if (!isNaN(d.getTime())) {
          counts[d.getMonth()]++;
        }
      });
      return months.map((name, idx) => ({ name, count: counts[idx] }));
    } else {
      const counts = {};
      const yearInt = parseInt(filterYear, 10) || new Date().getFullYear();
      const monthInt = parseInt(filterMonth, 10) - 1;
      const daysInMonth = new Date(yearInt, monthInt + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        counts[day] = 0;
      }
      timeFilteredTickets.forEach(ticket => {
        const openDate = ticket.Open_Date || ticket.openDate || ticket.Created_At;
        if (!openDate) return;
        const d = new Date(openDate);
        if (!isNaN(d.getTime()) && (d.getMonth() + 1).toString() === filterMonth) {
          const day = d.getDate();
          counts[day] = (counts[day] || 0) + 1;
        }
      });
      return Object.entries(counts).map(([day, count]) => ({ name: `Day ${day}`, count }));
    }
  }, [timeFilteredTickets, filterMonth, filterYear]);

  // 3. Bar Graph (Engineer & Repeated)
  const engineerAndRepeatedData = useMemo(() => {
    let residentCount = 0;
    let fieldCount = 0;
    let repeatedCount = 0;

    timeFilteredTickets.forEach(ticket => {
      const engType = String(ticket.Engineer_Type || ticket.engineerType || ticket.EngineerType || ticket.Engineer_Role || ticket.engineerRole || '').toLowerCase();
      if (engType.includes('resident') || engType === 'resident') {
        residentCount++;
      } else if (engType.includes('field') || engType === 'field') {
        fieldCount++;
      }

      const repeatedVal = ticket.Repeated || ticket.Is_Repeated || ticket.isRepeated || ticket.repeated || ticket.Repeat || ticket.Is_Repeated_Issue || false;
      const isRepeated = repeatedVal === true || String(repeatedVal).toLowerCase() === 'true' || String(repeatedVal).toLowerCase() === 'yes' || repeatedVal === 1 || repeatedVal === '1';
      if (isRepeated) {
        repeatedCount++;
      }
    });

    return [
      { name: 'Resident Engineer', count: residentCount },
      { name: 'Field Engineer', count: fieldCount },
      { name: 'Repeated Issues', count: repeatedCount }
    ];
  }, [timeFilteredTickets]);

  // 4. Bar Graph (Product Make)
  const ticketProductMakeData = useMemo(() => {
    const counts = {};
    timeFilteredTickets.forEach(ticket => {
      const linkedAsset = assets?.find(a => {
        const aRef = a.Unique_Product_Id || a.id || a.Ref_Code;
        const tRef = ticket.Asset_Ref_Code || ticket.Unique_Product_Id || ticket.Asset_ID || ticket.productId;
        return aRef && tRef && String(aRef).trim().toLowerCase() === String(tRef).trim().toLowerCase();
      }) || ticket;
      
      const make = linkedAsset.ProductMake || linkedAsset.Make || ticket.ProductMake || ticket.Make || 'Unknown Brand';
      counts[make] = (counts[make] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [timeFilteredTickets, assets]);

  // 5. Line Graph (Category Trend)
  const categoryTrendData = useMemo(() => {
    const categories = [...new Set(timeFilteredTickets.map(t => t.Category || t.category || 'Uncategorized').filter(Boolean))];

    if (filterMonth === 'ALL') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = months.map((name, idx) => {
        const item = { name };
        categories.forEach(cat => {
          item[cat] = 0;
        });
        return item;
      });

      timeFilteredTickets.forEach(ticket => {
        const openDate = ticket.Open_Date || ticket.openDate || ticket.Created_At;
        if (!openDate) return;
        const d = new Date(openDate);
        if (!isNaN(d.getTime())) {
          const monthIdx = d.getMonth();
          const cat = ticket.Category || ticket.category || 'Uncategorized';
          if (data[monthIdx] && cat) {
            data[monthIdx][cat] = (data[monthIdx][cat] || 0) + 1;
          }
        }
      });
      return { data, categories };
    } else {
      const yearInt = parseInt(filterYear, 10) || new Date().getFullYear();
      const monthInt = parseInt(filterMonth, 10) - 1;
      const daysInMonth = new Date(yearInt, monthInt + 1, 0).getDate();
      
      const data = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const item = { name: `Day ${day}` };
        categories.forEach(cat => {
          item[cat] = 0;
        });
        data.push(item);
      }

      timeFilteredTickets.forEach(ticket => {
        const openDate = ticket.Open_Date || ticket.openDate || ticket.Created_At;
        if (!openDate) return;
        const d = new Date(openDate);
        if (!isNaN(d.getTime()) && (d.getMonth() + 1).toString() === filterMonth) {
          const dayIdx = d.getDate() - 1;
          const cat = ticket.Category || ticket.category || 'Uncategorized';
          if (data[dayIdx] && cat) {
            data[dayIdx][cat] = (data[dayIdx][cat] || 0) + 1;
          }
        }
      });
      return { data, categories };
    }
  }, [timeFilteredTickets, filterMonth, filterYear]);

  // categoryData: Aggregates active tickets by category
  const categoryData = useMemo(() => {
    if (!timeFilteredTickets || timeFilteredTickets.length === 0) return [];
    
    const counts = {};
    timeFilteredTickets.forEach(ticket => {
      const status = String(ticket.Status || ticket.Ticket_Status || '').toLowerCase();
      if (status.includes('resolved') || status.includes('close')) return;
      
      const cat = ticket.Category || ticket.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [timeFilteredTickets]);

  // engineerPerformanceData: Aggregates resolved tickets by assigned engineer
  const engineerPerformanceData = useMemo(() => {
    if (!timeFilteredTickets || timeFilteredTickets.length === 0) return [];
    
    const counts = {};
    timeFilteredTickets.forEach(ticket => {
      const status = String(ticket.Status || ticket.Ticket_Status || '').toLowerCase();
      if (status.includes('resolved') || status.includes('close')) {
        const engName = ticket.Assigned_Engineer || ticket.assignedEngineer || ticket.Engineer_Name || 'Unassigned';
        counts[engName] = (counts[engName] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [timeFilteredTickets]);

  // ENGINE: Aggregate Active Tickets by Issue Type
  const issueTypeData = useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) return [];

    const counts = {};
    filteredTickets.forEach(ticket => {
      // Aggregate active tickets
      const status = String(ticket.Status || ticket.Ticket_Status || '').toLowerCase();
      if (status.includes('resolved') || status.includes('close')) return;

      const type = ticket.Issue_Type || ticket.issueType || 'Uncategorized';
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

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

  // 5. kpiDrillDownData: Resolved data to render inside the drill-down KPI modals
  const kpiDrillDownData = useMemo(() => {
    if (!kpiDrillDown || kpiDrillDown === 'COMPLAINTS') return [];

    // 1. Top KPI Card Filters
    if (kpiDrillDown === 'TOTAL') {
      return filteredAssets;
    }
    if (kpiDrillDown === 'WARRANTY') {
      return filteredAssets.filter(a => isWarrantyActive(a.Warranty_End_Date || a.warrantyEndDate));
    }
    if (kpiDrillDown === 'WARRANTY_EXPIRED') {
      return filteredAssets.filter(a => isWarrantyExpired(a.Warranty_End_Date || a.warrantyEndDate));
    }

    // 2. Contract Health Portfolio Filters
    if (kpiDrillDown === 'DLP') {
      return filteredAssets.filter(a => getSupportTier(a) === 'DLP');
    }
    if (kpiDrillDown === 'COMP_AMC') {
      return filteredAssets.filter(a => getSupportTier(a) === 'Comprehensive AMC');
    }
    if (kpiDrillDown === 'NON_COMP_AMC') {
      return filteredAssets.filter(a => getSupportTier(a) === 'Non-Comprehensive AMC');
    }
    if (kpiDrillDown === 'WARRANTY_NO_AMC') {
      return filteredAssets.filter(a => getSupportTier(a) === 'Out Of Support' && !isCompletelyUncovered(a));
    }
    if (kpiDrillDown === 'EXPIRED') {
      return filteredAssets.filter(a => isCompletelyUncovered(a));
    }
    return [];
  }, [kpiDrillDown, filteredAssets]);

  return (
    <div className="reporting-dashboard">
      <div className="dashboard-header">
        <h2>Analytics & Reporting Engine</h2>
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

      <div className="analytics-layout-grid">

        {/* CATEGORY FAILURE TRENDS GRAPH */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Hardware Failure Trends</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Volume of active tickets by category</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
            {loading ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : categoryData.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No active tickets.</div>
            ) : (
              categoryData.map((item, idx) => {
                const maxCount = categoryData[0].count;
                const barWidth = `${(item.count / maxCount) * 100}%`;

                return (
                  <div
                    key={idx}
                    onClick={() => setChartDrillDown({ filterType: 'CATEGORY', value: item.category })}
                    style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.2s', margin: '0 -6px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title={`Click to view all ${item.count} ${item.category} tickets`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                      <span>{item.category}</span>
                      <span style={{ color: '#8b5cf6' }}>{item.count}</span>
                    </div>
                    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: barWidth, background: '#8b5cf6', height: '100%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RECHARTS: PIE CHART (Asset Distribution by Brand) */}
        <div className="chart-panel md3-surface" style={{ flex: 1, minWidth: '300px' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Asset Distribution by Brand</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Proportion of managed hardware makes</p>
          <div className="recharts-container-box" style={{ marginTop: '10px', height: '250px', position: 'relative' }}>
            {loading ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
            ) : brandData.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>No brand data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandData.map(item => ({
                      name: item.make || item.brand || 'Unknown',
                      value: item.count || 0
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {brandData.map((entry, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={10}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.75rem', color: '#475569' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* --- TICKET ISSUE TYPE DISTRIBUTION --- */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Issue Type Breakdown</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Volume of open tickets by category</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
            {issueTypeData.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No active complaints.</div>
            ) : (
              issueTypeData.map((item, idx) => {
                const maxCount = issueTypeData[0].count;
                const barWidth = `${(item.count / maxCount) * 100}%`;

                return (
                  <div
                    key={idx}
                    onClick={() => setChartDrillDown({ filterType: 'ISSUE', value: item.type })}
                    style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.2s', margin: '0 -6px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title={`Click to view all ${item.count} ${item.type} tickets`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                      <span>{item.type}</span>
                      <span>{item.count}</span>
                    </div>
                    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: barWidth, background: '#ef4444', height: '100%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* --- ENGINEER PERFORMANCE GRAPH (RESOLVED TICKETS) --- */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Engineer Performance</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Volume of resolved tickets by engineer</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
            {engineerPerformanceData.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No resolved tickets found.</div>
            ) : (
              engineerPerformanceData.map((item, idx) => {
                const maxCount = engineerPerformanceData[0].count;
                const barWidth = `${(item.count / maxCount) * 100}%`;

                return (
                  <div
                    key={idx}
                    onClick={() => setChartDrillDown({ filterType: 'ENGINEER', value: item.name })}
                    style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.2s', margin: '0 -6px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title={`Click to view resolved tickets by ${item.name}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                      <span>{item.name}</span>
                      <span style={{ color: '#0369a1' }}>{item.count}</span>
                    </div>
                    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: barWidth, background: '#3b82f6', height: '100%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
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
            ) : ticketVolumeData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
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
            ) : monthlyIssueBreakdown.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={monthlyIssueBreakdown} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                    {monthlyIssueBreakdown.map((entry, index) => (
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
            ) : categoryTrendData.data.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryTrendData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {categoryTrendData.categories.map((cat, index) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[index % COLORS.length]} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 4: Dispatch Categories & Repeat Failures (Bar Chart) */}
        <div className="chart-panel md3-surface" style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Dispatch Categories & Repeat Failures</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Analysis of engineer dispatch type and recurring calls</p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : timeFilteredTickets.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engineerAndRepeatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 5: Brand Ticket Distribution (Bar Chart) */}
        <div className="chart-panel md3-surface" style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Brand Ticket Distribution</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Proportion of tickets grouped by product manufacturer</p>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</div>
            ) : ticketProductMakeData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketProductMakeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
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
      )}      {/* --- KPI DRILL-DOWN MODAL --- */}
      {kpiDrillDown && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '1100px', width: '95%', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>

            {/* 1. HEADER CONTAINER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
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
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {/* CSV DOWNLOAD BUTTON */}
                {kpiDrillDown !== 'COMPLAINTS' && (
                  <button
                    onClick={() => exportToCSV(kpiDrillDownData, 'Asset_Export')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                    Export CSV
                  </button>
                )}

                <button onClick={() => setKpiDrillDown(null)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            </div>
            {/* CRITICAL: Header div closes here! */}

            {/* 2. TABLE WRAPPER (Handles scrolling so the modal doesn't break) */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>

              {/* We use minWidth to ensure columns don't crush together on smaller screens */}
              <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>

                    {/* Dynamic Headers */}
                    {kpiDrillDown === 'COMPLAINTS' ? (
                      <>
                        <th style={{ padding: '12px', color: '#475569' }}>TICKET & DATE</th>
                        <th style={{ padding: '12px', color: '#475569' }}>LOCATION</th>
                        <th style={{ padding: '12px', color: '#475569' }}>ENGINEER</th>
                        <th style={{ padding: '12px', color: '#475569' }}>AFFECTED ASSET</th>
                        <th style={{ padding: '12px', color: '#475569' }}>SUPPORT TIER</th>
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
                <tbody>

                  {/* 1. TICKET DATA RENDERING */}
                  {kpiDrillDown === 'COMPLAINTS' && (() => {
                    const activeTickets = filteredTickets.filter(t => {
                      const s = String(t.Status || t.Ticket_Status || '').toLowerCase();
                      return !s.includes('resolved') && !s.includes('close');
                    });

                    if (activeTickets.length === 0) {
                      return <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No active tickets found.</td></tr>;
                    }

                    return activeTickets.map((ticket, i) => {
                      // Cross-reference the global assets array to pull full hardware details
                      // (Falls back to the ticket itself if the backend already joined the data)
                      const linkedAsset = assets?.find(a => {
                        const aRef = a.Unique_Product_Id || a.id || a.Ref_Code;
                        const tRef = ticket.Asset_Ref_Code || ticket.Unique_Product_Id;
                        return aRef && tRef && String(aRef).trim().toLowerCase() === String(tRef).trim().toLowerCase();
                      }) || ticket;

                      const openDate = ticket.Open_Date || ticket.Created_At || ticket.CreatedAt;
                      const company = ticket.Company || ticket.Company_Name || '-';
                      const branch = ticket.Branch || ticket.branch || '-';
                      const engineer = ticket.Assigned_Engineer || ticket.Engineer_Name || 'Unassigned';

                      const make = linkedAsset.Make || linkedAsset.ProductMake;
                      const model = linkedAsset.Model || linkedAsset.ProductModel;
                      const serial = linkedAsset.Serial_No || linkedAsset.ProductSerial || 'N/A';

                      // DYNAMIC CONTRACT CALCULATOR (Ignores backend Support_Type text)
                      const now = new Date().getTime();
                      let calculatedTier = 'Out Of Support';

                      const amcEnd = linkedAsset.AMC_End_Date || linkedAsset.amcEnd || linkedAsset.amcEndDate ? new Date(linkedAsset.AMC_End_Date || linkedAsset.amcEnd || linkedAsset.amcEndDate).getTime() : 0;
                      const nonAmcEnd = linkedAsset.NON_CAMC_End_Date || linkedAsset.nonAmcEnd || linkedAsset.nonAmcEndDate ? new Date(linkedAsset.NON_CAMC_End_Date || linkedAsset.nonAmcEnd || linkedAsset.nonAmcEndDate).getTime() : 0;
                      const dlpEnd = linkedAsset.DLP_End_Date || linkedAsset.dlpEnd || linkedAsset.dlpEndDate ? new Date(linkedAsset.DLP_End_Date || linkedAsset.dlpEnd || linkedAsset.dlpEndDate).getTime() : 0;

                      if (!isNaN(amcEnd) && amcEnd >= now) {
                        calculatedTier = 'Comprehensive AMC';
                      } else if (!isNaN(nonAmcEnd) && nonAmcEnd >= now) {
                        calculatedTier = 'Non-Comprehensive AMC';
                      } else if (!isNaN(dlpEnd) && dlpEnd >= now) {
                        calculatedTier = 'DLP';
                      }

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>

                          {/* Ticket ID & Open Date Stacked */}
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                            <div style={{ color: '#dc2626', fontWeight: 'bold' }}>{ticket.Ticket_ID || '-'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                              {openDate ? new Date(openDate).toLocaleDateString('en-GB') : 'No Date'}
                            </div>
                          </td>

                          {/* Location (Company & Branch) */}
                          <td style={{ padding: '12px', color: '#334155', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>{company}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{branch}</div>
                          </td>

                          {/* Assigned Engineer */}
                          <td style={{ padding: '12px', color: '#334155', fontWeight: 'bold', verticalAlign: 'top' }}>
                            {engineer}
                          </td>

                          {/* Affected Asset (Make, Model, Serial Stacked) */}
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                             {make || model ? (
                               <>
                                 <div style={{ fontWeight: 'bold' }}>{make || ''} {model || ''}</div>
                                 <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SN: {serial || '-'}</div>
                               </>
                             ) : (
                               <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No Asset Data</span>
                             )}
                           </td>

                        </tr>
                      );
                    });
                  })()}

                  {/* 2. ASSET DATA RENDERING */}
                  {kpiDrillDown !== 'COMPLAINTS' && (() => {
                    // Filter logic for the specific Asset KPI clicked
                    let dataToRender = filteredAssets;
                    if (kpiDrillDown === 'WARRANTY') {
                      dataToRender = filteredAssets.filter(a => isWarrantyActive(a.Warranty_End_Date || a.warrantyEndDate));
                    }
                    if (kpiDrillDown === 'WARRANTY_EXPIRED') {
                      dataToRender = filteredAssets.filter(a => isWarrantyExpired(a.Warranty_End_Date || a.warrantyEndDate));
                    }
                    if (kpiDrillDown === 'EXPIRED') {
                      // CRITICAL FIX: Only render assets that are 100% uncovered
                      dataToRender = filteredAssets.filter(a => isCompletelyUncovered(a));
                    }
                    if (kpiDrillDown === 'WARRANTY_NO_AMC') {
                      dataToRender = filteredAssets.filter(a => getSupportTier(a) === 'Out Of Support' && !isCompletelyUncovered(a));
                    }

                    if (dataToRender.length === 0) {
                      return <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No assets found matching this criterion.</td></tr>;
                    }

                    return dataToRender.map((asset, i) => {
                      // Calculate Warranty Days Left inline
                      let warrantyDaysLeft = null;
                      const wEndDate = asset.Warranty_End_Date || asset.warrantyEndDate;
                      if (wEndDate) {
                        const diff = new Date(wEndDate).getTime() - new Date().getTime();
                        warrantyDaysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
                      }

                      const assetId = asset.Unique_Product_Id || asset.id || asset.Ref_Code || '-';
                      const make = asset.Make || asset.ProductMake || '-';
                      const model = asset.Model || asset.ProductModel || '';
                      const serial = asset.Serial_No || asset.ProductSerial || 'N/A';
                      const salesOrder = asset.Sales_Order || asset.salesOrder || '-';

                      // DYNAMIC CONTRACT CALCULATOR (Ignores backend Support_Type text)
                      const now = new Date().getTime();
                      let calculatedTier = 'Out Of Support';

                      const amcEnd = asset.AMC_End_Date || asset.amcEnd || asset.amcEndDate ? new Date(asset.AMC_End_Date || asset.amcEnd || asset.amcEndDate).getTime() : 0;
                      const nonAmcEnd = asset.NON_CAMC_End_Date || asset.nonAmcEnd || asset.nonAmcEndDate ? new Date(asset.NON_CAMC_End_Date || asset.nonAmcEnd || asset.nonAmcEndDate).getTime() : 0;
                      const dlpEnd = asset.DLP_End_Date || asset.dlpEnd || asset.dlpEndDate ? new Date(asset.DLP_End_Date || asset.dlpEnd || asset.dlpEndDate).getTime() : 0;

                      if (!isNaN(dlpEnd) && dlpEnd >= now) {
                        calculatedTier = 'DLP';
                      } else if (!isNaN(amcEnd) && amcEnd >= now) {
                        calculatedTier = 'Comprehensive AMC';
                      } else if (!isNaN(nonAmcEnd) && nonAmcEnd >= now) {
                        calculatedTier = 'Non-Comprehensive AMC';
                      }

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>

                          {/* 1. Asset ID */}
                          <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold', verticalAlign: 'top' }}>
                            {assetId}
                          </td>

                          {/* 2. Location (Company & Branch Stacked) */}
                          <td style={{ padding: '12px', color: '#334155', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>{asset.Company_Name || '-'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{asset.Branch || '-'}</div>
                          </td>

                          {/* 3. Product & Serial Stacked */}
                          <td style={{ padding: '12px', color: '#334155', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>{make} {model}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>SN: {serial}</div>
                          </td>

                          {/* 4. Sales Order */}
                          <td style={{ padding: '12px', color: '#334155', fontWeight: 'bold', verticalAlign: 'top' }}>
                            {salesOrder}
                          </td>

                          {/* 5. Warranty End Date & Days Left Stacked */}
                          <td style={{ padding: '12px', color: '#334155', verticalAlign: 'top' }}>
                            {wEndDate ? (
                              <>
                                <div>{new Date(wEndDate).toLocaleDateString('en-GB')}</div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  marginTop: '2px',
                                  color: warrantyDaysLeft > 30 ? '#166534' : warrantyDaysLeft > 0 ? '#b45309' : '#991b1b'
                                }}>
                                  {warrantyDaysLeft > 0 ? `${warrantyDaysLeft} Days Left` : 'Expired'}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No Warranty Data</span>
                            )}
                          </td>

                          {/* 6. Support Tier Badges */}
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                              
                              {/* BADGE 1: Managed Service Contract (DLP / AMC) */}
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

                              {/* BADGE 2: OEM Warranty (Only renders if currently active) */}
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
                    });
                  })()}

                  {/* FALLBACK FOR EMPTY ARRAYS JUST IN CASE */}
                  {kpiDrillDown !== 'COMPLAINTS' && filteredAssets.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No assets found matching this criterion.</td></tr>
                  )}

                </tbody>
              </table>
            </div>

            {/* 3. FOOTER CONTAINER */}
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
                  {chartDrillDown.filterType === 'ENGINEER' && <>Resolved tickets handled by: <strong style={{ color: '#0369a1' }}>{chartDrillDown.value}</strong></>}
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
                      const isActive = ticketStatus !== 'Resolved' && ticketStatus !== 'Closed';
                      return (t.Issue_Type || t.issueType || 'Uncategorized') === chartDrillDown.value && isActive;
                    }

                    // 2. ENGINEER: Must match the engineer AND strictly be a completed ticket (since this tracks performance)
                    if (chartDrillDown.filterType === 'ENGINEER') {
                      const isCompleted = ticketStatus === 'Resolved' || ticketStatus === 'Closed';
                      return engineerName === chartDrillDown.value && isCompleted;
                    }

                    // 3. CATEGORY: Must match the category AND strictly be an open/active ticket
                    if (chartDrillDown.filterType === 'CATEGORY') {
                      const isActive = ticketStatus !== 'Resolved' && ticketStatus !== 'Closed';
                      return (t.Category || t.category || 'Uncategorized') === chartDrillDown.value && isActive;
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
                            background: String(ticket.Status || '').toLowerCase().includes('resolved') ? '#dcfce7' : '#fee2e2',
                            color: String(ticket.Status || '').toLowerCase().includes('resolved') ? '#166534' : '#991b1b'
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
                      const isActive = ticketStatus !== 'Resolved' && ticketStatus !== 'Closed';
                      return (t.Issue_Type || t.issueType || 'Uncategorized') === chartDrillDown.value && isActive;
                    }

                    // 2. ENGINEER: Must match the engineer AND strictly be a completed ticket (since this tracks performance)
                    if (chartDrillDown.filterType === 'ENGINEER') {
                      const isCompleted = ticketStatus === 'Resolved' || ticketStatus === 'Closed';
                      return engineerName === chartDrillDown.value && isCompleted;
                    }

                    // 3. CATEGORY: Must match the category AND strictly be an open/active ticket
                    if (chartDrillDown.filterType === 'CATEGORY') {
                      const isActive = ticketStatus !== 'Resolved' && ticketStatus !== 'Closed';
                      return (t.Category || t.category || 'Uncategorized') === chartDrillDown.value && isActive;
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

