import { useState, useEffect } from 'react';
import * as api from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function Leads({ onLeadConverted }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [convertModal, setConvertModal] = useState(null);
  const [dealNameInput, setDealNameInput] = useState('');
  const [dealNameError, setDealNameError] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const data = await api.getLeads();
      setLeads(data || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteLead(id);
      setDeleteConfirm(null);
      loadLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleConvertClick = async (lead) => {
    // Check if company name already exists as a deal
    const dealName = lead.company || 'New Deal';
    try {
      const { exists } = await api.checkDealNameExists(dealName);
      if (exists) {
        setConvertModal(lead);
        setDealNameInput(dealName);
        setDealNameError('A deal with this name already exists. Please enter a different name.');
      } else {
        // Convert directly
        await convertLead(lead.id, dealName);
      }
    } catch (err) {
      console.error('Failed to check deal name:', err);
    }
  };

  const convertLead = async (leadId, dealName) => {
    setConverting(true);
    try {
      await api.convertLeadToDeal(leadId, dealName);
      setConvertModal(null);
      setDealNameInput('');
      setDealNameError('');
      loadLeads();
      if (onLeadConverted) onLeadConverted();
    } catch (err) {
      console.error('Failed to convert lead:', err);
    } finally {
      setConverting(false);
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!dealNameInput.trim()) {
      setDealNameError('Please enter a deal name');
      return;
    }

    // Check if the new name exists
    try {
      const { exists } = await api.checkDealNameExists(dealNameInput);
      if (exists) {
        setDealNameError('A deal with this name already exists. Please enter a different name.');
        return;
      }
      await convertLead(convertModal.id, dealNameInput.trim());
    } catch (err) {
      console.error('Failed to convert lead:', err);
    }
  };

  const newLeadsCount = leads.filter(l => l.status === 'new').length;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="leads-container">
      <div className="leads-header">
        <h2>Leads</h2>
        <div className="leads-stats">
          <div className="leads-stat">
            <span className="stat-label">New Leads</span>
            <span className="stat-value">{newLeadsCount}</span>
          </div>
          <div className="leads-stat">
            <span className="stat-label">Total</span>
            <span className="stat-value">{leads.length}</span>
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="leads-empty">
          <p>No leads yet. Leads will appear here when submitted through the website form.</p>
        </div>
      ) : (
        <table className="leads-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Message</th>
              <th style={{ width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className={lead.status === 'converted' ? 'lead-converted' : ''}>
                <td className="date-cell">{formatDate(lead.received_date)}</td>
                <td>{[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '-'}</td>
                <td>{lead.company || '-'}</td>
                <td>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="email-link">{lead.email}</a>
                  ) : '-'}
                </td>
                <td>{lead.mobile || '-'}</td>
                <td className="message-cell">
                  {lead.message ? (
                    <span title={lead.message}>
                      {lead.message.length > 50 ? lead.message.substring(0, 50) + '...' : lead.message}
                    </span>
                  ) : '-'}
                </td>
                <td className="actions-cell">
                  {lead.status === 'converted' ? (
                    <span className="converted-badge">Moved to Pipeline</span>
                  ) : (
                    <>
                      <button
                        className="btn-convert"
                        onClick={() => handleConvertClick(lead)}
                        title="Move to Pipeline"
                      >
                        To Pipeline
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => setDeleteConfirm(lead)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Lead?</h3>
            <p>Are you sure you want to delete the lead from "{deleteConfirm.company || 'Unknown'}"?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {convertModal && (
        <div className="modal-overlay" onClick={() => setConvertModal(null)}>
          <div className="modal-content convert-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Move Lead to Pipeline</h2>
              <button className="modal-close" onClick={() => setConvertModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleConvertSubmit}>
              <div className="modal-body">
                <p className="convert-lead-info">
                  <strong>{[convertModal.firstname, convertModal.lastname].filter(Boolean).join(' ')}</strong>
                  {convertModal.company && <span> from {convertModal.company}</span>}
                </p>

                <div className="form-group">
                  <label>Deal Name</label>
                  <input
                    type="text"
                    value={dealNameInput}
                    onChange={(e) => {
                      setDealNameInput(e.target.value);
                      setDealNameError('');
                    }}
                    placeholder="Enter deal name"
                    autoFocus
                  />
                  {dealNameError && <p className="form-error">{dealNameError}</p>}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setConvertModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={converting}>
                  {converting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
