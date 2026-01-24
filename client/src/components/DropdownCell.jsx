import { useState, useRef, useEffect } from 'react';

export default function DropdownCell({ value, displayValue, options, onChange, placeholder = 'Select...', onTab, onShiftTab }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (option) => {
    onChange(option.id);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(!open);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setOpen(false);
      setTimeout(() => {
        if (e.shiftKey && onShiftTab) {
          onShiftTab();
        } else if (!e.shiftKey && onTab) {
          onTab();
        }
      }, 0);
    }
  };

  return (
    <div className="dropdown-cell" ref={ref}>
      <div
        className="cell-display dropdown-trigger"
        onClick={() => setOpen(!open)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {displayValue || <span className="placeholder">{placeholder}</span>}
        <span className="dropdown-arrow">▼</span>
      </div>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={() => { onChange(null); setOpen(false); }}>
            <span className="placeholder">None</span>
          </div>
          {options.map(opt => (
            <div
              key={opt.id}
              className={`dropdown-item ${opt.id === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt.name || opt.value}
              {opt.probability !== undefined && ` (${opt.probability}%)`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
