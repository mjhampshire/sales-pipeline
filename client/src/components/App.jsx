import { useState, useEffect } from 'react';
import PipelineTable from './PipelineTable';
import ForecastSummary from './ForecastSummary';
import SettingsModal from './SettingsModal';
import ConfirmModal from './ConfirmModal';
import ImportModal from './ImportModal';
import WonConfirmModal from './WonConfirmModal';
import * as api from '../api';

export default function App() {
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [partners, setPartners] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [products, setProducts] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'id', order: 'asc' });
  const [currentView, setCurrentView] = useState('pipeline');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, dealId: null, dealName: '' });
  const [wonConfirm, setWonConfirm] = useState({ open: false, deal: null });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadDeals();
    }
  }, [sortConfig]);

  const loadData = async () => {
    try {
      const [dealsData, stagesData, partnersData, platformsData, productsData] = await Promise.all([
        api.getDeals(sortConfig.key, sortConfig.order),
        api.getStages(),
        api.getListItems('partner'),
        api.getListItems('platform'),
        api.getListItems('product')
      ]);
      setDeals(dealsData || []);
      setStages(stagesData || []);
      setPartners(partnersData || []);
      setPlatforms(platformsData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    try {
      const dealsData = await api.getDeals(sortConfig.key, sortConfig.order);
      setDeals(dealsData || []);
    } catch (err) {
      console.error('Failed to load deals:', err);
    }
  };

  const reloadLists = async () => {
    try {
      const [stagesData, partnersData, platformsData, productsData] = await Promise.all([
        api.getStages(),
        api.getListItems('partner'),
        api.getListItems('platform'),
        api.getListItems('product')
      ]);
      setStages(stagesData || []);
      setPartners(partnersData || []);
      setPlatforms(platformsData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Failed to reload lists:', err);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleAddDeal = async () => {
    try {
      const newDeal = await api.createDeal({ deal_name: 'New Deal' });
      if (newDeal && newDeal.id) {
        setDeals(prev => [...prev, newDeal]);
      } else {
        console.error('Invalid deal returned from API:', newDeal);
        await loadDeals();
      }
    } catch (err) {
      console.error('Failed to add deal:', err);
    }
  };

  const handleUpdateDeal = async (id, updates) => {
    // Check if status is being changed to 'won'
    if (updates.status === 'won') {
      const deal = deals.find(d => d.id === id);
      if (deal && deal.status !== 'won') {
        setWonConfirm({ open: true, deal });
        return;
      }
    }

    try {
      const updated = await api.updateDeal(id, updates);
      setDeals(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  const handleWonConfirm = async (dealId, dealValue) => {
    setWonConfirm({ open: false, deal: null });
    try {
      const updated = await api.updateDeal(dealId, { status: 'won', deal_value: dealValue });
      setDeals(prev => prev.map(d => d.id === dealId ? updated : d));
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  const handleWonCancel = () => {
    setWonConfirm({ open: false, deal: null });
  };

  const handleRequestDeleteDeal = (id) => {
    const deal = deals.find(d => d.id === id);
    setDeleteConfirm({ open: true, dealId: id, dealName: deal?.deal_name || 'this deal' });
  };

  const handleConfirmDeleteDeal = async () => {
    const { dealId } = deleteConfirm;
    setDeleteConfirm({ open: false, dealId: null, dealName: '' });
    try {
      await api.deleteDeal(dealId);
      setDeals(prev => prev.filter(d => d.id !== dealId));
    } catch (err) {
      console.error('Failed to delete deal:', err);
    }
  };

  const handleCancelDeleteDeal = () => {
    setDeleteConfirm({ open: false, dealId: null, dealName: '' });
  };

  // Stage handlers
  const handleCreateStage = async (stage) => {
    try {
      const newStage = await api.createStage(stage);
      setStages(prev => [...prev, newStage]);
    } catch (err) {
      console.error('Failed to create stage:', err);
    }
  };

  const handleUpdateStage = async (id, updates) => {
    try {
      const updated = await api.updateStage(id, updates);
      setStages(prev => prev.map(s => s.id === id ? updated : s));
      await loadDeals();
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleDeleteStage = async (id) => {
    try {
      await api.deleteStage(id);
      setStages(prev => prev.filter(s => s.id !== id));
      await loadDeals();
    } catch (err) {
      console.error('Failed to delete stage:', err);
    }
  };

  // List item handlers
  const handleCreateListItem = async (type, item) => {
    try {
      const newItem = await api.createListItem(type, item);
      if (type === 'partner') setPartners(prev => [...prev, newItem]);
      if (type === 'platform') setPlatforms(prev => [...prev, newItem]);
      if (type === 'product') setProducts(prev => [...prev, newItem]);
    } catch (err) {
      console.error('Failed to create list item:', err);
    }
  };

  const handleUpdateListItem = async (type, id, updates) => {
    try {
      const updated = await api.updateListItem(type, id, updates);
      if (type === 'partner') setPartners(prev => prev.map(i => i.id === id ? updated : i));
      if (type === 'platform') setPlatforms(prev => prev.map(i => i.id === id ? updated : i));
      if (type === 'product') setProducts(prev => prev.map(i => i.id === id ? updated : i));
      await loadDeals();
    } catch (err) {
      console.error('Failed to update list item:', err);
    }
  };

  const handleDeleteListItem = async (type, id) => {
    try {
      await api.deleteListItem(type, id);
      if (type === 'partner') setPartners(prev => prev.filter(i => i.id !== id));
      if (type === 'platform') setPlatforms(prev => prev.filter(i => i.id !== id));
      if (type === 'product') setProducts(prev => prev.filter(i => i.id !== id));
      await loadDeals();
    } catch (err) {
      console.error('Failed to delete list item:', err);
    }
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
    reloadLists();
    loadDeals();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>The Wishlist Sales Pipeline</h1>
        <div className="header-right">
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${currentView === 'pipeline' ? 'active' : ''}`}
              onClick={() => setCurrentView('pipeline')}
            >
              Pipeline
            </button>
            <button
              className={`nav-tab ${currentView === 'forecast' ? 'active' : ''}`}
              onClick={() => setCurrentView('forecast')}
            >
              Forecast Summary
            </button>
          </nav>
          <button className="import-btn" onClick={() => setImportOpen(true)}>
            Import CSV
          </button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>
      <main>
        {currentView === 'pipeline' ? (
          <PipelineTable
            deals={deals}
            stages={stages}
            partners={partners}
            platforms={platforms}
            products={products}
            onUpdateDeal={handleUpdateDeal}
            onDeleteDeal={handleRequestDeleteDeal}
            onAddDeal={handleAddDeal}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ) : (
          <ForecastSummary deals={deals} stages={stages} />
        )}
      </main>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={handleSettingsClose}
        stages={stages}
        partners={partners}
        platforms={platforms}
        products={products}
        onCreateStage={handleCreateStage}
        onUpdateStage={handleUpdateStage}
        onDeleteStage={handleDeleteStage}
        onCreateListItem={handleCreateListItem}
        onUpdateListItem={handleUpdateListItem}
        onDeleteListItem={handleDeleteListItem}
      />
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deleteConfirm.dealName}"?`}
        onConfirm={handleConfirmDeleteDeal}
        onCancel={handleCancelDeleteDeal}
      />
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        stages={stages}
        partners={partners}
        platforms={platforms}
        products={products}
        deals={deals}
        onCreateStage={handleCreateStage}
        onCreateListItem={handleCreateListItem}
        onCreateDeal={api.createDeal}
        onReloadData={loadData}
      />
      <WonConfirmModal
        isOpen={wonConfirm.open}
        deal={wonConfirm.deal}
        onConfirm={handleWonConfirm}
        onCancel={handleWonCancel}
      />
    </div>
  );
}
