const KpiCards = ({ tickets }) => {
  const ticketsArray = Array.isArray(tickets) ? tickets : [];

  const total = ticketsArray.length;
  
  const opened = ticketsArray.filter(t => {
    const s = (t?.Status || '').toLowerCase();
    return s.includes('open');
  }).length;

  const inProgress = ticketsArray.filter(t => {
    const s = (t?.Status || '').toLowerCase();
    return s.includes('progress') || s.includes('waiting') || s.includes('assign') || s.includes('ready');
  }).length;

  const closed = ticketsArray.filter(t => {
    const s = (t?.Status || '').toLowerCase();
    return s.includes('close');
  }).length;



  return (
    <div className="kpi-row">
      <div className="kpi-card border-dark">
        <h3>Total Tickets</h3>
        <h2>{total}</h2>
      </div>
      <div className="kpi-card border-warning">
        <h3>Opened</h3>
        <h2>{opened}</h2>
      </div>
      <div className="kpi-card border-info">
        <h3>In Progress</h3>
        <h2>{inProgress}</h2>
      </div>
      <div className="kpi-card border-success">
        <h3>Closed</h3>
        <h2>{closed}</h2>
      </div>
    </div>
  );
};

export default KpiCards;