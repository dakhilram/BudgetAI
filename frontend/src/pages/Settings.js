import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { paymentService, exportService, categoryService } from '../services/api';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon, 
  Lock, 
  Sparkles, 
  Download, 
  LogOut,
  User,
  Mail,
  Shield,
  Tag,
  Plus,
  X,
  CheckCircle
} from 'lucide-react';

export default function Settings() {
  const { user, logout, updatePin, isPro, upgradeToPro } = useAuth();
  const { categories, fetchCategories } = useApp();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [pinStep, setPinStep] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3b82f6',
    icon: 'tag'
  });

  const COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'
  ];

  useEffect(() => {
    if (!initialized) {
      fetchCategories();
      setInitialized(true);
    }
  }, [fetchCategories, initialized]);

  const handlePinChange = (index, value, isConfirm = false) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const setter = isConfirm ? setConfirmPin : setNewPin;
    const current = isConfirm ? [...confirmPin] : [...newPin];
    current[index] = value;
    setter(current);

    // Auto-focus next input
    if (value && index < 3) {
      const prefix = isConfirm ? 'confirm-pin' : 'new-pin';
      const nextInput = document.getElementById(`${prefix}-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-advance to confirm step
    if (value && index === 3 && !isConfirm) {
      setTimeout(() => {
        setPinStep(2);
        document.getElementById('confirm-pin-0')?.focus();
      }, 200);
    }
  };

  const handlePinSubmit = async () => {
    const pinCode = newPin.join('');
    const confirmCode = confirmPin.join('');

    if (pinCode !== confirmCode) {
      toast.error('PINs do not match');
      setConfirmPin(['', '', '', '']);
      setPinStep(1);
      document.getElementById('new-pin-0')?.focus();
      return;
    }

    try {
      await updatePin(pinCode);
      toast.success('PIN updated successfully');
      setShowPinModal(false);
      setNewPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setPinStep(1);
    } catch (error) {
      toast.error('Failed to update PIN');
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      await categoryService.create(categoryForm);
      await fetchCategories();
      toast.success('Category created');
      setShowCategoryModal(false);
      setCategoryForm({ name: '', color: '#3b82f6', icon: 'tag' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Delete this category?')) {
      try {
        await categoryService.delete(id);
        await fetchCategories();
        toast.success('Category deleted');
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Cannot delete default category');
      }
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await exportService.csv();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV exported!');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const response = await paymentService.createCheckout(window.location.origin);
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate checkout');
    }
  };

  return (
    <div className="animate-fade-in" data-testid="settings-page">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SettingsIcon size={32} color="#8b5cf6" />
          Settings
        </h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 600
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {user?.name}
              {isPro && <span className="pro-badge">PRO</span>}
            </div>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={14} />
              {user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Security</h3>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={20} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>PIN Lock</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {user?.pin ? 'PIN is set' : 'Protect your app with a PIN'}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPinModal(true)}
            data-testid="set-pin-btn"
          >
            {user?.pin ? 'Change' : 'Set Up'}
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Categories</h3>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCategoryModal(true)}
            data-testid="add-category-btn"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {categories.map(cat => (
            <div 
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: `${cat.color}20`,
                borderRadius: '20px',
                border: `1px solid ${cat.color}40`
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: cat.color
              }}></div>
              <span style={{ fontSize: '0.875rem' }}>{cat.name}</span>
              {!cat.is_default && (
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex'
                  }}
                >
                  <X size={14} color="var(--text-muted)" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Export Data</h3>
        <button 
          className="btn btn-secondary"
          onClick={handleExportCSV}
          disabled={exporting}
          data-testid="export-csv-btn"
        >
          <Download size={18} />
          {exporting ? 'Exporting...' : 'Export Transactions (CSV)'}
        </button>
      </div>

      {/* Subscription Section */}
      {!isPro && (
        <div className="card ai-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={24} color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Upgrade to Pro</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Unlock AI insights, predictions & more
                </div>
              </div>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowUpgradeModal(true)}
              data-testid="settings-upgrade-btn"
            >
              Upgrade - $9.99/mo
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="card">
        <button 
          className="btn btn-danger"
          onClick={logout}
          style={{ width: '100%' }}
          data-testid="logout-btn"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{pinStep === 1 ? 'Set New PIN' : 'Confirm PIN'}</h2>
              <button className="modal-close" onClick={() => setShowPinModal(false)}>
                <X size={24} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>
              {pinStep === 1 ? 'Enter a 4-digit PIN' : 'Confirm your PIN'}
            </p>

            <div className="pin-input-container" style={{ justifyContent: 'center' }}>
              {(pinStep === 1 ? newPin : confirmPin).map((digit, index) => (
                <input
                  key={index}
                  id={`${pinStep === 1 ? 'new-pin' : 'confirm-pin'}-${index}`}
                  type="password"
                  maxLength={1}
                  className="pin-digit"
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value, pinStep === 2)}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {pinStep === 2 && (
              <button 
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '1.5rem' }}
                onClick={handlePinSubmit}
              >
                Save PIN
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Category</h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Category name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="category-name-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-picker">
                {COLORS.map(color => (
                  <div
                    key={color}
                    className={`color-option ${categoryForm.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCategoryModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateCategory}
                style={{ flex: 1 }}
                data-testid="save-category-btn"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal upgrade-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="upgrade-content">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <Sparkles size={48} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>Upgrade to Pro</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Unlock the full power of AI-driven financial insights
                </p>
              </div>

              <ul className="upgrade-features">
                {[
                  'AI-powered spending analysis',
                  'Personalized savings suggestions',
                  'Budget recommendations',
                  'Expense predictions',
                  'Auto-categorization',
                  'Financial health score',
                  'Downloadable PDF reports',
                  'Priority support'
                ].map((feature, index) => (
                  <li key={index}>
                    <CheckCircle size={20} color="#10b981" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="upgrade-price">
                <span className="price">$9.99</span>
                <span className="period">/month</span>
              </div>

              <button 
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleUpgrade}
                data-testid="modal-checkout-btn"
              >
                Upgrade Now
              </button>

              <button 
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={() => setShowUpgradeModal(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
