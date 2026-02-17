import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner';
import { 
  Plus, 
  X, 
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

export default function Budgets() {
  const { 
    budgets, 
    fetchBudgets, 
    createBudget, 
    updateBudget, 
    deleteBudget,
    categories,
    fetchCategories,
    currentMonth,
    setCurrentMonth,
    loading 
  } = useApp();
  
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    month: currentMonth
  });

  useEffect(() => {
    if (!initialized) {
      fetchCategories();
      fetchBudgets(currentMonth);
      setInitialized(true);
    }
  }, [fetchCategories, fetchBudgets, currentMonth, initialized]);

  const handlePrevMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    const newMonth = format(date, 'yyyy-MM');
    setCurrentMonth(newMonth);
    fetchBudgets(newMonth);
  };

  const handleNextMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    const newMonth = format(date, 'yyyy-MM');
    setCurrentMonth(newMonth);
    fetchBudgets(newMonth);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      month: currentMonth
    });
    setEditingBudget(null);
  };

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        category: budget.category,
        amount: budget.amount.toString(),
        month: budget.month
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const data = {
        category: formData.category,
        amount: parseFloat(formData.amount),
        month: currentMonth
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, { amount: data.amount });
        toast.success('Budget updated');
      } else {
        await createBudget(data);
        toast.success('Budget created');
      }
      
      handleCloseModal();
      fetchBudgets(currentMonth);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id);
        toast.success('Budget deleted');
      } catch (error) {
        toast.error('Failed to delete budget');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getMonthDisplay = () => {
    try {
      return format(new Date(currentMonth + '-01'), 'MMMM yyyy');
    } catch {
      return currentMonth;
    }
  };

  const getProgressColor = (spent, total) => {
    const percent = (spent / total) * 100;
    if (percent >= 100) return 'danger';
    if (percent >= 80) return 'warning';
    return 'safe';
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  // Get categories not yet budgeted
  const expenseCategories = categories.filter(c => !['Salary', 'Freelance', 'Investment'].includes(c.name));
  const budgetedCategories = budgets.map(b => b.category);
  const availableCategories = expenseCategories.filter(c => !budgetedCategories.includes(c.name));

  return (
    <div className="animate-fade-in" data-testid="budgets-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Budgets</h1>
            <p className="page-subtitle">Set and track your monthly spending limits</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenModal()}
            disabled={availableCategories.length === 0}
            data-testid="add-budget-btn"
          >
            <Plus size={20} />
            Add Budget
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="month-selector">
        <button className="month-nav-btn" onClick={handlePrevMonth}>
          <ChevronLeft size={20} />
        </button>
        <span className="month-display">{getMonthDisplay()}</span>
        <button className="month-nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="stat-label">Total Budget</div>
            <div className="stat-value mono">{formatCurrency(totalBudget)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-label">Spent</div>
            <div className="stat-value expense mono">{formatCurrency(totalSpent)}</div>
          </div>
        </div>
        <div className="progress-bar" style={{ height: '12px' }}>
          <div 
            className={`progress-fill ${getProgressColor(totalSpent, totalBudget)}`}
            style={{ width: `${Math.min((totalSpent / totalBudget) * 100 || 0, 100)}%` }}
          ></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <span>{((totalSpent / totalBudget) * 100 || 0).toFixed(1)}% used</span>
          <span>{formatCurrency(totalBudget - totalSpent)} remaining</span>
        </div>
      </div>

      {/* Budget Cards */}
      {loading && !budgets.length ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : budgets.length > 0 ? (
        <div data-testid="budgets-list">
          {budgets.map((budget) => {
            const percentage = (budget.spent / budget.amount) * 100;
            const isOverBudget = percentage >= 100;
            const isWarning = percentage >= 80 && percentage < 100;
            
            return (
              <div key={budget.id} className="budget-card">
                <div className="budget-header">
                  <div className="budget-category">
                    <div 
                      className="budget-icon"
                      style={{ backgroundColor: `${getCategoryColor(budget.category)}20` }}
                    >
                      <Target size={18} color={getCategoryColor(budget.category)} />
                    </div>
                    <div>
                      <div className="budget-name">
                        {budget.category}
                        {isOverBudget && (
                          <AlertTriangle size={16} color="#ef4444" style={{ marginLeft: '0.5rem' }} />
                        )}
                        {isWarning && (
                          <AlertTriangle size={16} color="#f59e0b" style={{ marginLeft: '0.5rem' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {percentage.toFixed(1)}% used
                      </div>
                    </div>
                  </div>
                  <div className="budget-amounts">
                    <div className={`budget-spent ${isOverBudget ? 'expense' : ''}`}>
                      {formatCurrency(budget.spent)}
                    </div>
                    <div className="budget-total">of {formatCurrency(budget.amount)}</div>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${getProgressColor(budget.spent, budget.amount)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenModal(budget)}
                    data-testid={`edit-budget-${budget.id}`}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(budget.id)}
                    data-testid={`delete-budget-${budget.id}`}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Target size={48} />
            <h3>No budgets set</h3>
            <p>Create budgets to track your spending by category</p>
            <button 
              className="btn btn-primary" 
              onClick={() => handleOpenModal()}
              style={{ marginTop: '1rem' }}
            >
              <Plus size={20} />
              Create Your First Budget
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  disabled={!!editingBudget}
                  data-testid="budget-category-select"
                >
                  <option value="">Select category</option>
                  {editingBudget ? (
                    <option value={editingBudget.category}>{editingBudget.category}</option>
                  ) : (
                    availableCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Budget Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  data-testid="budget-amount-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} data-testid="save-budget-btn">
                  {editingBudget ? 'Update' : 'Create'} Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
