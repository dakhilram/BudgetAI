import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/api';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  X, 
  ArrowUpRight, 
  ArrowDownRight,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    transactions, 
    fetchTransactions, 
    createTransaction, 
    updateTransaction, 
    deleteTransaction,
    categories,
    fetchCategories,
    currentMonth,
    setCurrentMonth,
    loading 
  } = useApp();
  const { isPro } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [initialized, setInitialized] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    if (!initialized) {
      fetchCategories();
      fetchTransactions({ month: currentMonth });
      setInitialized(true);
    }
  }, [fetchCategories, fetchTransactions, currentMonth, initialized]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleSearch = useCallback(() => {
    fetchTransactions({
      month: currentMonth,
      search: searchQuery,
      type: filterType,
      category: filterCategory,
      sort_by: sortBy,
      sort_order: sortOrder
    });
  }, [fetchTransactions, currentMonth, searchQuery, filterType, filterCategory, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (initialized) {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, filterType, filterCategory, sortBy, sortOrder, handleSearch, initialized]);

  const handlePrevMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    const newMonth = format(date, 'yyyy-MM');
    setCurrentMonth(newMonth);
    fetchTransactions({ month: newMonth });
  };

  const handleNextMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    const newMonth = format(date, 'yyyy-MM');
    setCurrentMonth(newMonth);
    fetchTransactions({ month: newMonth });
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });
    setEditingTransaction(null);
  };

  const handleOpenModal = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        category: transaction.category,
        description: transaction.description || '',
        date: transaction.date,
        notes: transaction.notes || ''
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
    
    if (!formData.amount || !formData.category) {
      toast.error('Please fill in amount and category');
      return;
    }

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
        toast.success('Transaction updated');
      } else {
        await createTransaction(data);
        toast.success('Transaction added');
      }
      
      handleCloseModal();
      fetchTransactions({ month: currentMonth });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save transaction');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        toast.success('Transaction deleted');
      } catch (error) {
        toast.error('Failed to delete transaction');
      }
    }
  };

  const handleAutoCategorize = async () => {
    if (!isPro) {
      toast.error('Auto-categorize is a Pro feature');
      return;
    }
    if (!formData.description) {
      toast.error('Enter a description first');
      return;
    }
    try {
      const response = await aiService.categorize(formData.description);
      setFormData(prev => ({ ...prev, category: response.data.category }));
      toast.success(`Category detected: ${response.data.category}`);
    } catch (error) {
      toast.error('Failed to auto-categorize');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateDisplay = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getMonthDisplay = () => {
    try {
      return format(new Date(currentMonth + '-01'), 'MMMM yyyy');
    } catch {
      return currentMonth;
    }
  };

  const expenseCategories = categories.filter(c => !['Salary', 'Freelance', 'Investment'].includes(c.name));
  const incomeCategories = categories.filter(c => ['Salary', 'Freelance', 'Investment', 'Other'].includes(c.name));
  const activeCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="animate-fade-in" data-testid="transactions-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Transactions</h1>
            <p className="page-subtitle">Track your income and expenses</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenModal()}
            data-testid="add-transaction-btn"
          >
            <Plus size={20} />
            Add Transaction
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

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} 
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '3rem' }}
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '120px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            data-testid="filter-type"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '140px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            data-testid="filter-category"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '130px' }}
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order);
            }}
            data-testid="sort-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {loading && !transactions.length ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : transactions.length > 0 ? (
          <div data-testid="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div 
                  className="transaction-icon"
                  style={{ 
                    backgroundColor: transaction.type === 'income' 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {transaction.type === 'income' ? (
                    <ArrowUpRight size={20} color="#10b981" />
                  ) : (
                    <ArrowDownRight size={20} color="#ef4444" />
                  )}
                </div>
                <div className="transaction-details">
                  <div className="transaction-category">{transaction.category}</div>
                  <div className="transaction-description">
                    {transaction.description || transaction.notes || '-'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="transaction-date">{formatDateDisplay(transaction.date)}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenModal(transaction)}
                    data-testid={`edit-transaction-${transaction.id}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(transaction.id)}
                    data-testid={`delete-transaction-${transaction.id}`}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Filter size={48} />
            <h3>No transactions found</h3>
            <p>Try adjusting your filters or add a new transaction</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Transaction Type Toggle */}
              <div className="form-group">
                <label className="form-label">Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn ${formData.type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: '' }))}
                    style={{ flex: 1 }}
                    data-testid="type-expense-btn"
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`btn ${formData.type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: '' }))}
                    style={{ flex: 1 }}
                    data-testid="type-income-btn"
                  >
                    Income
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  data-testid="amount-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  data-testid="category-select"
                >
                  <option value="">Select category</option>
                  {activeCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="What was this for?"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    style={{ flex: 1 }}
                    data-testid="description-input"
                  />
                  {isPro && formData.type === 'expense' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAutoCategorize}
                      title="Auto-categorize with AI"
                    >
                      <Sparkles size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  data-testid="date-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="notes-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} data-testid="save-transaction-btn">
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
