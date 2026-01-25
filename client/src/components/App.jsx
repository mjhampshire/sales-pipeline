import { useState, useEffect } from 'react';
import PipelineTable from './PipelineTable';
import ForecastSummary from './ForecastSummary';
import MonthlySnapshot from './MonthlySnapshot';
import WonDeals from './WonDeals';
import LostDeals from './LostDeals';
import Leads from './Leads';
import SettingsModal from './SettingsModal';
import ConfirmModal from './ConfirmModal';
import ImportModal from './ImportModal';
import WonConfirmModal from './WonConfirmModal';
import LostConfirmModal from './LostConfirmModal';
import CloseMonthModal from './CloseMonthModal';
import * as api from '../api';

export default function App() {
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [partners, setPartners] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [products, setProducts] = useState([]);
  const [sources, setSources] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'id', order: 'asc' });
  const [currentView, setCurrentView] = useState('pipeline');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, dealId: null, dealName: '' });
  const [wonConfirm, setWonConfirm] = useState({ open: false, deal: null });
  const [lostConfirm, setLostConfirm] = useState({ open: false, deal: null });
  const [closeMonthStatus, setCloseMonthStatus] = useState(null);
  const [closeMonthModalOpen, setCloseMonthModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    loadCloseMonthStatus();
    // Poll close month status every minute
    const interval = setInterval(loadCloseMonthStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      loadDeals();
    }
  }, [sortConfig]);

  // Reload deals when switching to pipeline view
  useEffect(() => {
    if (!loading && currentView === 'pipeline') {
      loadDeals();
    }
  }, [currentView]);

  const loadData = async () => {
    try {
      const [dealsData, stagesData, partnersData, platformsData, productsData, sourcesData] = await Promise.all([
        api.getDeals(sortConfig.key, sortConfig.order),
        api.getStages(),
        api.getListItems('partner'),
        api.getListItems('platform'),
        api.getListItems('product'),
        api.getListItems('source')
      ]);
      setDeals(dealsData || []);
      setStages(stagesData || []);
      setPartners(partnersData || []);
      setPlatforms(platformsData || []);
      setProducts(productsData || []);
      setSources(sourcesData || []);
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
      const [stagesData, partnersData, platformsData, productsData, sourcesData] = await Promise.all([
        api.getStages(),
        api.getListItems('partner'),
        api.getListItems('platform'),
        api.getListItems('product'),
        api.getListItems('source')
      ]);
      setStages(stagesData || []);
      setPartners(partnersData || []);
      setPlatforms(platformsData || []);
      setProducts(productsData || []);
      setSources(sourcesData || []);
    } catch (err) {
      console.error('Failed to reload lists:', err);
    }
  };

  const loadCloseMonthStatus = async () => {
    try {
      const status = await api.getCloseMonthStatus();
      setCloseMonthStatus(status);
    } catch (err) {
      console.error('Failed to load close month status:', err);
    }
  };

  const handleCloseMonthClick = () => {
    setCloseMonthModalOpen(true);
  };

  const handleCloseMonthConfirm = async () => {
    setCloseMonthModalOpen(false);
    try {
      await api.closeMonth('manual');
      await loadCloseMonthStatus();
      await loadDeals();
    } catch (err) {
      console.error('Failed to close month:', err);
      alert(err.message || 'Failed to close month');
    }
  };

  const handleCloseMonthCancel = () => {
    setCloseMonthModalOpen(false);
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

    // Check if status is being changed to 'lost'
    if (updates.status === 'lost') {
      const deal = deals.find(d => d.id === id);
      if (deal && deal.status !== 'lost') {
        setLostConfirm({ open: true, deal });
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

  const handleWonConfirm = async (dealId, dealValue, closeMonth, closeYear) => {
    setWonConfirm({ open: false, deal: null });
    try {
      // Find a 100% stage to set for won deals
      const wonStage = stages.find(s => s.probability === 100);
      const updated = await api.updateDeal(dealId, {
        status: 'won',
        deal_value: dealValue,
        close_month: closeMonth,
        close_year: closeYear,
        ...(wonStage && { deal_stage_id: wonStage.id })
      });
      setDeals(prev => prev.map(d => d.id === dealId ? updated : d));
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  const handleWonCancel = () => {
    setWonConfirm({ open: false, deal: null });
  };

  const handleLostConfirm = async (dealId, lossReason) => {
    setLostConfirm({ open: false, deal: null });
    try {
      const deal = deals.find(d => d.id === dealId);
      // Prepend loss reason to existing notes
      let newNotes = deal?.notes || '';
      if (lossReason) {
        const reasonText = `Loss Reason: ${lossReason}`;
        newNotes = newNotes ? `${reasonText}\n\n${newNotes}` : reasonText;
      }

      const updated = await api.updateDeal(dealId, {
        status: 'lost',
        notes: newNotes
      });
      setDeals(prev => prev.map(d => d.id === dealId ? updated : d));
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  const handleLostCancel = () => {
    setLostConfirm({ open: false, deal: null });
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
      return newStage;
    } catch (err) {
      console.error('Failed to create stage:', err);
      throw err;
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
      if (type === 'source') setSources(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      console.error('Failed to create list item:', err);
      throw err;
    }
  };

  const handleUpdateListItem = async (type, id, updates) => {
    try {
      const updated = await api.updateListItem(type, id, updates);
      if (type === 'partner') setPartners(prev => prev.map(i => i.id === id ? updated : i));
      if (type === 'platform') setPlatforms(prev => prev.map(i => i.id === id ? updated : i));
      if (type === 'product') setProducts(prev => prev.map(i => i.id === id ? updated : i));
      if (type === 'source') setSources(prev => prev.map(i => i.id === id ? updated : i));
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
      if (type === 'source') setSources(prev => prev.filter(i => i.id !== id));
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
        <div className="header-title">
          <img src="/logo-icon.png" alt="The Wishlist" className="header-logo" />
          <h1>The Wishlist Sales Pipeline</h1>
        </div>
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
            <button
              className={`nav-tab ${currentView === 'snapshot' ? 'active' : ''}`}
              onClick={() => setCurrentView('snapshot')}
            >
              Monthly Snapshot
            </button>
            <button
              className={`nav-tab ${currentView === 'won' ? 'active' : ''}`}
              onClick={() => setCurrentView('won')}
            >
              Won Deals
            </button>
            <button
              className={`nav-tab ${currentView === 'lost' ? 'active' : ''}`}
              onClick={() => setCurrentView('lost')}
            >
              Lost Deals
            </button>
            <button
              className={`nav-tab ${currentView === 'leads' ? 'active' : ''}`}
              onClick={() => setCurrentView('leads')}
            >
              Leads
            </button>
          </nav>
          {closeMonthStatus && (
            <button
              className={`close-month-btn ${closeMonthStatus.shouldFlash && !closeMonthStatus.priorMonthClosed ? 'flashing' : ''}`}
              onClick={handleCloseMonthClick}
            >
              {closeMonthStatus.priorMonthClosed ? 'Resave Prior Month' : 'Save Prior Month'}
            </button>
          )}
          <button className="import-btn" onClick={() => setImportOpen(true)}>
            Import CSV
          </button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>
      <main>
        {currentView === 'pipeline' && (
          <PipelineTable
            deals={deals}
            stages={stages}
            sources={sources}
            partners={partners}
            platforms={platforms}
            products={products}
            onUpdateDeal={handleUpdateDeal}
            onDeleteDeal={handleRequestDeleteDeal}
            onAddDeal={handleAddDeal}
            onRefresh={loadDeals}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}
        {currentView === 'forecast' && (
          <ForecastSummary deals={deals} stages={stages} />
        )}
        {currentView === 'snapshot' && <MonthlySnapshot />}
        {currentView === 'won' && <WonDeals />}
        {currentView === 'lost' && <LostDeals />}
        {currentView === 'leads' && <Leads onLeadConverted={loadDeals} />}
      </main>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={handleSettingsClose}
        stages={stages}
        sources={sources}
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
        sources={sources}
        partners={partners}
        platforms={platforms}
        products={products}
        deals={deals}
        onCreateStage={handleCreateStage}
        onCreateListItem={handleCreateListItem}
        onCreateDeal={api.createDeal}
        onCreateArchivedDeal={api.createArchivedDeal}
        onReloadData={loadData}
      />
      <WonConfirmModal
        isOpen={wonConfirm.open}
        deal={wonConfirm.deal}
        onConfirm={handleWonConfirm}
        onCancel={handleWonCancel}
      />
      <LostConfirmModal
        isOpen={lostConfirm.open}
        deal={lostConfirm.deal}
        onConfirm={handleLostConfirm}
        onCancel={handleLostCancel}
      />
      <CloseMonthModal
        isOpen={closeMonthModalOpen}
        priorMonth={closeMonthStatus?.priorMonth}
        priorYear={closeMonthStatus?.priorYear}
        priorMonthClosed={closeMonthStatus?.priorMonthClosed}
        onConfirm={handleCloseMonthConfirm}
        onCancel={handleCloseMonthCancel}
      />
    </div>
  );
}
