import { useState, useEffect } from 'react';
import * as api from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

export default function NotesModal({ isOpen, onClose, dealId, dealName, onNotesUpdated }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && dealId) {
      loadNotes();
    }
  }, [isOpen, dealId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.getDealNotes(dealId);
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.createDealNote(dealId, newNoteText.trim(), today);
      setNewNoteText('');
      await loadNotes();
      if (onNotesUpdated) onNotesUpdated();
    } catch (err) {
      console.error('Failed to add note:', err);
      alert('Failed to add note: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note) => {
    setEditingNoteId(note.id);
    setEditingText(note.note_text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) return;

    setSaving(true);
    try {
      await api.updateDealNote(editingNoteId, editingText.trim());
      setEditingNoteId(null);
      setEditingText('');
      await loadNotes();
      if (onNotesUpdated) onNotesUpdated();
    } catch (err) {
      console.error('Failed to update note:', err);
      alert('Failed to update note: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.deleteDealNote(noteId);
      await loadNotes();
      if (onNotesUpdated) onNotesUpdated();
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert('Failed to delete note: ' + err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Notes - {dealName}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Add new note section */}
          <div className="notes-add-section">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new note..."
              className="notes-textarea"
              rows={3}
            />
            <button
              className="btn-primary"
              onClick={handleAddNote}
              disabled={saving || !newNoteText.trim()}
            >
              {saving ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          {/* Notes history */}
          <div className="notes-history">
            <h3>History</h3>
            {loading ? (
              <div className="notes-loading">Loading notes...</div>
            ) : notes.length === 0 ? (
              <div className="notes-empty">No notes yet</div>
            ) : (
              <div className="notes-list">
                {notes.map(note => (
                  <div key={note.id} className="note-item">
                    <div className="note-header">
                      <span className="note-date">{formatDate(note.note_date)}</span>
                      <div className="note-actions">
                        {editingNoteId !== note.id && (
                          <>
                            <button
                              className="note-action-btn"
                              onClick={() => handleStartEdit(note)}
                              title="Edit"
                            >
                              &#9998;
                            </button>
                            <button
                              className="note-action-btn delete"
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete"
                            >
                              &times;
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingNoteId === note.id ? (
                      <div className="note-edit">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="notes-textarea"
                          rows={3}
                        />
                        <div className="note-edit-actions">
                          <button
                            className="btn-primary"
                            onClick={handleSaveEdit}
                            disabled={saving}
                          >
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="note-text">{note.note_text}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
