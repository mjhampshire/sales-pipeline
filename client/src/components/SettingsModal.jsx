import { useState, useRef } from 'react';
import UserManagement from './UserManagement';
import ImportModal from './ImportModal';

function EditableListItem({ item, onUpdate, onDelete, showProbability = false }) {
  const [localName, setLocalName] = useState(item.name || item.value || '');
  const [localProbability, setLocalProbability] = useState(item.probability || 0);
  const lastSavedRef = useRef({ name: item.name || item.value, probability: item.probability });

  // Only reset local state if the item was changed externally (not by our own save)
  const currentName = item.name || item.value;
  if (currentName !== lastSavedRef.current.name && currentName !== localName) {
    setLocalName(currentName || '');
    lastSavedRef.current.name = currentName;
  }
  if (item.probability !== lastSavedRef.current.probability && item.probability !== localProbability) {
    setLocalProbability(item.probability || 0);
    lastSavedRef.current.probability = item.probability;
  }

  const handleSave = () => {
    const nameField = item.name !== undefined ? 'name' : 'value';
    const currentItemName = item.name || item.value;

    if (localName !== currentItemName || (showProbability && localProbability !== item.probability)) {
      // Update the ref to track what we're saving
      lastSavedRef.current = { name: localName, probability: localProbability };
      onUpdate({
        [nameField]: localName,
        probability: localProbability,
        sort_order: item.sort_order
      });
    }
  };

  return (
    <div className="settings-item">
      <input
        type="text"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleSave}
        className="settings-input"
      />
      {showProbability && (
        <>
          <input
            type="number"
            min="0"
            max="100"
            value={localProbability}
            onChange={(e) => setLocalProbability(parseInt(e.target.value) || 0)}
            onBlur={handleSave}
            className="settings-input probability-input"
          />
          <span className="probability-label">%</span>
        </>
      )}
      <button className="delete-item-btn" onClick={onDelete}>×</button>
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  stages,
  sources,
  partners,
  platforms,
  products,
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
  onCreateListItem,
  onUpdateListItem,
  onDeleteListItem,
  isAdmin,
  deals,
  onCreateDeal,
  onCreateArchivedDeal,
  onReloadData
}) {
  const [activeTab, setActiveTab] = useState('stages');
  const [newItemValue, setNewItemValue] = useState('');
  const [newStageProbability, setNewStageProbability] = useState(50);
  const [showImport, setShowImport] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 'stages', label: 'Deal Stages' },
    { id: 'source', label: 'Sources' },
    { id: 'partner', label: 'Partners' },
    { id: 'platform', label: 'Platforms' },
    { id: 'product', label: 'Products' },
    ...(isAdmin ? [
      { id: 'users', label: 'Users' },
      { id: 'import', label: 'Import CSV' }
    ] : [])
  ];

  const handleAddStage = () => {
    if (!newItemValue.trim()) return;
    const maxOrder = stages.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
    onCreateStage({
      name: newItemValue.trim(),
      probability: newStageProbability,
      sort_order: maxOrder + 1
    });
    setNewItemValue('');
    setNewStageProbability(50);
  };

  const handleAddListItem = (type) => {
    if (!newItemValue.trim()) return;
    const items = type === 'partner' ? partners : type === 'platform' ? platforms : type === 'source' ? sources : products;
    const maxOrder = items.reduce((max, i) => Math.max(max, i.sort_order || 0), 0);
    onCreateListItem(type, {
      value: newItemValue.trim(),
      sort_order: maxOrder + 1
    });
    setNewItemValue('');
  };

  const renderStagesTab = () => (
    <div className="settings-list">
      {stages.map(stage => (
        <EditableListItem
          key={stage.id}
          item={stage}
          showProbability={true}
          onUpdate={(updates) => onUpdateStage(stage.id, updates)}
          onDelete={() => onDeleteStage(stage.id)}
        />
      ))}
      <div className="settings-item new-item">
        <input
          type="text"
          value={newItemValue}
          onChange={(e) => setNewItemValue(e.target.value)}
          placeholder="New stage name"
          className="settings-input"
          onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
        />
        <input
          type="number"
          min="0"
          max="100"
          value={newStageProbability}
          onChange={(e) => setNewStageProbability(parseInt(e.target.value) || 0)}
          className="settings-input probability-input"
        />
        <span className="probability-label">%</span>
        <button className="add-item-btn" onClick={handleAddStage}>+</button>
      </div>
    </div>
  );

  const renderListTab = (type, items) => (
    <div className="settings-list">
      {items.map(item => (
        <EditableListItem
          key={item.id}
          item={item}
          onUpdate={(updates) => onUpdateListItem(type, item.id, updates)}
          onDelete={() => onDeleteListItem(type, item.id)}
        />
      ))}
      <div className="settings-item new-item">
        <input
          type="text"
          value={newItemValue}
          onChange={(e) => setNewItemValue(e.target.value)}
          placeholder={`New ${type}`}
          className="settings-input"
          onKeyDown={(e) => e.key === 'Enter' && handleAddListItem(type)}
        />
        <button className="add-item-btn" onClick={() => handleAddListItem(type)}>+</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setNewItemValue(''); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {activeTab === 'stages' && renderStagesTab()}
          {activeTab === 'source' && renderListTab('source', sources)}
          {activeTab === 'partner' && renderListTab('partner', partners)}
          {activeTab === 'platform' && renderListTab('platform', platforms)}
          {activeTab === 'product' && renderListTab('product', products)}
          {activeTab === 'users' && isAdmin && <UserManagement />}
          {activeTab === 'import' && isAdmin && (
            <div className="import-tab-content">
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Import deals from a CSV file. You can import active pipeline deals or historical won/lost deals.
              </p>
              <button className="btn-primary" onClick={() => setShowImport(true)}>
                Open Import Tool
              </button>
            </div>
          )}
        </div>
      </div>
      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          stages={stages}
          sources={sources}
          partners={partners}
          platforms={platforms}
          products={products}
          deals={deals}
          onCreateStage={onCreateStage}
          onCreateListItem={onCreateListItem}
          onCreateDeal={onCreateDeal}
          onCreateArchivedDeal={onCreateArchivedDeal}
          onReloadData={onReloadData}
        />
      )}
    </div>
  );
}
