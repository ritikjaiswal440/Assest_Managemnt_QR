import { useState, useEffect } from 'react';

const FilterBar = ({ bundle, onFilterChange, userRole, onDownloadReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [company, setCompany] = useState('All');
  const [location, setLocation] = useState('All');
  const [status, setStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quarter, setQuarter] = useState('Custom');
  const [sortBy, setSortBy] = useState('date_desc');

  // Custom Hotel Datepicker Popup States
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoveredDate, setHoveredDate] = useState('');

  const currentYearBound = new Date().getFullYear();

  // Extract unique locations safely with defensive checks
  const uniqueLocations = [
    ...new Set((bundle?.parents || []).map((p) => p?.Location).filter(Boolean))
  ].sort();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Helper to check if dates match a specific quarter of the current year
  const checkQuarterMatch = (start, end) => {
    if (start === `${currentYearBound}-04-01` && end === `${currentYearBound}-06-30`) return 'Q1';
    if (start === `${currentYearBound}-07-01` && end === `${currentYearBound}-09-30`) return 'Q2';
    if (start === `${currentYearBound}-10-01` && end === `${currentYearBound}-12-31`) return 'Q3';
    if (start === `${currentYearBound}-01-01` && end === `${currentYearBound}-03-31`) return 'Q4';
    return 'Custom';
  };

  const handleQuarterChange = (value) => {
    setQuarter(value);
    if (value === 'Q1') {
      setStartDate(`${currentYearBound}-04-01`);
      setEndDate(`${currentYearBound}-06-30`);
    } else if (value === 'Q2') {
      setStartDate(`${currentYearBound}-07-01`);
      setEndDate(`${currentYearBound}-09-30`);
    } else if (value === 'Q3') {
      setStartDate(`${currentYearBound}-10-01`);
      setEndDate(`${currentYearBound}-12-31`);
    } else if (value === 'Q4') {
      setStartDate(`${currentYearBound}-01-01`);
      setEndDate(`${currentYearBound}-03-31`);
    }
  };

  const handleDateClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate('');
      setQuarter('Custom');
    } else {
      if (dateStr >= startDate) {
        setEndDate(dateStr);
        setQuarter(checkQuarterMatch(startDate, dateStr));
        setIsOpen(false);
      } else {
        setStartDate(dateStr);
        setEndDate('');
        setQuarter('Custom');
      }
    }
  };

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    setQuarter('Custom');
    setIsOpen(false);
  };

  // Close calendar popup if clicked outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.hotel-datepicker-wrapper')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  // Trigger the filter update whenever a dependency changes
  useEffect(() => {
    onFilterChange({ searchTerm, company, location, status, startDate, endDate, quarter, sortBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, company, location, status, startDate, endDate, quarter, sortBy]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDisplayValue = () => {
    if (startDate && endDate) {
      return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
    }
    if (startDate) {
      return `${formatDateDisplay(startDate)} - Choose End`;
    }
    return 'Select Date Range';
  };

  const renderDays = () => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];

    // Empty spaces for previous month's offset
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      
      let dayClass = 'calendar-day';
      if (dateStr === startDate) dayClass += ' range-start';
      else if (dateStr === endDate) dayClass += ' range-end';
      else if (startDate && endDate && dateStr > startDate && dateStr < endDate) dayClass += ' range-in';
      else if (startDate && !endDate && hoveredDate && dateStr > startDate && dateStr <= hoveredDate) dayClass += ' range-hover';

      days.push(
        <div 
          key={day} 
          className={dayClass}
          onClick={() => handleDateClick(dateStr)}
          onMouseEnter={() => startDate && !endDate && setHoveredDate(dateStr)}
        >
          {day}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="controls-row">
      <div className="search-box">
        <input 
          type="text" 
          className="control-input" 
          placeholder="🔍 Search by ID, Ref, Room, or Issue..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Hide company filter if the user is a Client (they only see their own) */}
      {userRole !== 'Client' && (
        <div className="filter-box">
          <select className="control-input" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="All">All Companies</option>
            {bundle?.clients?.map((c, idx) => {
              const companyName = typeof c === 'object' ? c.Company_Name : c;
              return <option key={idx} value={companyName}>{companyName}</option>;
            })}
          </select>
        </div>
      )}

      <div className="filter-box">
        <select className="control-input" value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="All">All Locations</option>
          {uniqueLocations.map((loc, idx) => (
            <option key={idx} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      <div className="filter-box">
        <select className="control-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Opened">Opened</option>
          <option value="In Progress">In Progress</option>
          <option value="Ready to Close">Ready to Close</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="filter-box">
        <select 
          className="control-input" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          title="Sort tickets by"
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="client_asc">Client (A-Z)</option>
          <option value="status_sort">Status</option>
        </select>
      </div>

      <div className="filter-box">
        <select 
          className="control-input export-quarter-select" 
          value={quarter} 
          onChange={(e) => handleQuarterChange(e.target.value)}
          title="Select Quick Quarter or Custom Range"
        >
          <option value="Custom">Custom</option>
          <option value="Q1">Q1 (Apr-Jun)</option>
          <option value="Q2">Q2 (Jul-Sep)</option>
          <option value="Q3">Q3 (Oct-Dec)</option>
          <option value="Q4">Q4 (Jan-Mar)</option>
        </select>
      </div>

      <div className="filter-box hotel-datepicker-wrapper">
        <div 
          className="control-input hotel-datepicker-display"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>📅 {getDisplayValue()}</span>
          {(startDate || endDate) && (
            <button 
              className="hotel-datepicker-clear"
              onClick={(e) => {
                e.stopPropagation();
                handleResetDates();
              }}
              type="button"
              title="Clear dates"
              aria-label="Clear selected dates"
            >
              ×
            </button>
          )}
        </div>
        
        {isOpen && (
          <div className="hotel-calendar-popup">
            <div className="calendar-header">
              <button type="button" onClick={prevMonth}>&lt;</button>
              <span>{monthNames[currentMonth]} {currentYear}</span>
              <button type="button" onClick={nextMonth}>&gt;</button>
            </div>
            
            <div className="calendar-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="calendar-grid-header">{d}</div>
              ))}
              
              {renderDays()}
            </div>
          </div>
        )}
      </div>

      <div className="filter-box download-box">
        <button 
          className="btn btn-outline" 
          onClick={onDownloadReport}
          type="button"
          style={{ width: '100%' }}
        >
          Download Report
        </button>
      </div>
    </div>
  );
};

export default FilterBar;