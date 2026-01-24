import { useState, useRef, useEffect } from 'react';

export default function EditableCell({ value, onChange, type = 'text', placeholder = '', onTab, onShiftTab }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef(null);
  const cellRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Mark as mounted after first render
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const saveAndClose = () => {
    setEditing(false);
    if (localValue !== (value ?? '')) {
      onChange(localValue || null);
    }
  };

  const handleBlur = (e) => {
    // Don't close if moving to another element within the same cell
    if (cellRef.current && cellRef.current.contains(e.relatedTarget)) {
      return;
    }
    saveAndClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveAndClose();
    } else if (e.key === 'Escape') {
      setLocalValue(value ?? '');
      setEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveAndClose();
      // Small delay to ensure state is saved before moving
      setTimeout(() => {
        if (e.shiftKey && onShiftTab) {
          onShiftTab();
        } else if (!e.shiftKey && onTab) {
          onTab();
        }
      }, 0);
    }
  };

  const enterEditMode = () => {
    setEditing(true);
  };

  const handleFocus = () => {
    // Only auto-enter edit mode if component has been mounted
    // This prevents issues during initial render
    if (mountedRef.current) {
      setEditing(true);
    }
  };

  if (editing) {
    return (
      <div ref={cellRef}>
        <input
          ref={inputRef}
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="cell-input"
        />
      </div>
    );
  }

  return (
    <div
      className="cell-display"
      onClick={enterEditMode}
      tabIndex={0}
      onFocus={handleFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enterEditMode();
        }
      }}
    >
      {value || <span className="placeholder">{placeholder}</span>}
    </div>
  );
}
