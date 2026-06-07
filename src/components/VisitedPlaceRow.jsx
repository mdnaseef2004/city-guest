import React from 'react';
import { MapPin, Clock, Trash2 } from 'lucide-react';

export default function VisitedPlaceRow({ index, row, onChange, onRemove, canRemove }) {
  const set = (field) => (e) => onChange(index, field, e.target.value);

  return (
    <div className="visit-row">
      {/* Visited Place */}
      <div className="form-group">
        <label className="form-label" htmlFor={`vp-place-${index}`}>
          Visited Place <span className="required">*</span>
        </label>
        <div className="input-wrap">
          <span className="input-icon"><MapPin size={15} /></span>
          <input
            id={`vp-place-${index}`}
            type="text"
            className="form-input"
            placeholder="e.g. Main Office, Temple, Hall"
            value={row.visited_place}
            onChange={set('visited_place')}
            required
          />
        </div>
      </div>

      {/* Time In */}
      <div className="form-group">
        <label className="form-label" htmlFor={`vp-in-${index}`}>Time In</label>
        <div className="input-wrap">
          <span className="input-icon"><Clock size={15} /></span>
          <input
            id={`vp-in-${index}`}
            type="time"
            className="form-input"
            value={row.time_in}
            onChange={set('time_in')}
          />
        </div>
      </div>

      {/* Time Out */}
      <div className="form-group">
        <label className="form-label" htmlFor={`vp-out-${index}`}>Time Out</label>
        <div className="input-wrap">
          <span className="input-icon"><Clock size={15} /></span>
          <input
            id={`vp-out-${index}`}
            type="time"
            className="form-input"
            value={row.time_out}
            onChange={set('time_out')}
          />
        </div>
      </div>

      {/* Remove button */}
      <div className="form-group" style={{ justifyContent: 'flex-end', paddingBottom: 1 }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          title="Remove row"
          style={{ color: canRemove ? 'var(--danger)' : 'var(--border)', alignSelf: 'flex-end' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
