import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color = 'primary', subtitle }) => {
  return (
    <div className="stat-card">
      {/* Left: text content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-sub">{subtitle}</div>}
      </div>

      {/* Right: icon bubble */}
      <div className={`stat-icon ${color}`}>
        <Icon size={22} />
      </div>
    </div>
  );
};

export default StatsCard;
