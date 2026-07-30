import React from 'react';
import { TrendingUp, Circle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

const StatsCard = ({ title, value, icon: Icon, color = 'primary', trendText, sparklineData, isLive, subtitle }) => {
  const colorMap = {
    primary: { text: '#059669', bg: '#ecfdf5', line: '#34d399' },
    success: { text: '#10b981', bg: '#ecfdf5', line: '#6ee7b7' },
    info: { text: '#3b82f6', bg: '#eff6ff', line: '#93c5fd' },
    warning: { text: '#f59e0b', bg: '#fffbeb', line: '#fcd34d' },
  };
  const theme = colorMap[color] || colorMap.primary;

  return (
    <div className="stat-card" style={{ 
      display: 'flex', flexDirection: 'column', padding: '24px', 
      background: 'var(--surface)', borderRadius: '24px', 
      border: '1px solid rgba(0,0,0,0.03)', 
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', 
      position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.08)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
    }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
        </div>
        <div style={{ 
          width: '48px', height: '48px', borderRadius: '14px', 
          background: theme.bg, color: theme.text, display: 'flex', 
          alignItems: 'center', justifyContent: 'center' 
        }}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '12px', width: 'fit-content' }}>
        {isLive ? (
          <>
            <Circle size={10} fill="currentColor" color={theme.text} className="pulse-animate" />
            <span style={{ color: theme.text }}>Live Now</span>
          </>
        ) : trendText ? (
          <>
            <TrendingUp size={16} color={theme.text} />
            <span style={{ color: theme.text }}>{trendText}</span>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>{subtitle || 'All time'}</span>
        )}
      </div>

      {sparklineData && (
        <div style={{ position: 'absolute', right: '-10px', bottom: '0', width: '55%', height: '55%', opacity: 0.6 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey="value" stroke={theme.line} strokeWidth={3} dot={false} isAnimationActive={true} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .pulse-animate { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default StatsCard;
