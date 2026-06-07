import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { format, startOfWeek, startOfMonth, subDays } from 'date-fns';

const QUICK = [
  { label: 'Today', key: 'today' },
  { label: 'Yesterday', key: 'yesterday' },
  { label: 'This Week', key: 'thisWeek' },
  { label: 'This Month', key: 'thisMonth' },
];

const DateRangePicker = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => {

  const handleQuick = (key) => {
    const today = new Date();
    switch (key) {
      case 'today':
        onStartDateChange(format(today, 'yyyy-MM-dd'));
        onEndDateChange(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday': {
        const y = subDays(today, 1);
        onStartDateChange(format(y, 'yyyy-MM-dd'));
        onEndDateChange(format(y, 'yyyy-MM-dd'));
        break;
      }
      case 'thisWeek':
        onStartDateChange(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        onEndDateChange(format(today, 'yyyy-MM-dd'));
        break;
      case 'thisMonth':
        onStartDateChange(format(startOfMonth(today), 'yyyy-MM-dd'));
        onEndDateChange(format(today, 'yyyy-MM-dd'));
        break;
      default: break;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Date inputs row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderRadius: '12px', padding: '10px 16px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
        width: 'fit-content',
      }}>
        <Calendar size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <input
          type="date"
          value={startDate || ''}
          onChange={e => onStartDateChange(e.target.value)}
          max={endDate || undefined}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: '14px', color: 'var(--text)', fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        />
        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        <input
          type="date"
          value={endDate || ''}
          onChange={e => onEndDateChange(e.target.value)}
          min={startDate || undefined}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: '14px', color: 'var(--text)', fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Quick-select pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {QUICK.map(({ label, key }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleQuick(key)}
            style={{
              padding: '5px 14px',
              border: '1.5px solid var(--border)',
              borderRadius: '999px',
              background: 'var(--surface)',
              color: 'var(--text-muted)',
              fontSize: '12.5px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--primary-light)';
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangePicker;
