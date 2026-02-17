import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const { dashboard, fetchDashboard, currentMonth, setCurrentMonth, loading } = useApp();
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      fetchDashboard(currentMonth);
      setInitialized(true);
    }
  }, [fetchDashboard, currentMonth, initialized]);

  const handlePrevMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    const newMonth = format(date, 'yyyy-MM');
    setCurrentMonth(newMonth);
    fetchDashboard(newMonth);
  };

  const handleNextMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    const newMonth = format(date, 'yyyy-MM');
    setCurrentMonth(newMonth);
    fetchDashboard(newMonth);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
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

  if (loading && !dashboard) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Here's your financial overview</p>
      </div>

      {/* Month Selector */}
      <div className="month-selector">
        <button className="month-nav-btn" onClick={handlePrevMonth} data-testid="prev-month-btn">
          <ChevronLeft size={20} />
        </button>
        <span className="month-display" data-testid="month-display">{getMonthDisplay()}</span>
        <button className="month-nav-btn" onClick={handleNextMonth} data-testid="next-month-btn">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card" data-testid="income-card">
          <div className="stat-icon income">
            <TrendingUp size={24} />
          </div>
          <div className="stat-label">Total Income</div>
          <div className="stat-value income mono" data-testid="total-income">
            {formatCurrency(dashboard?.total_income)}
          </div>
        </div>

        <div className="stat-card" data-testid="expense-card">
          <div className="stat-icon expense">
            <TrendingDown size={24} />
          </div>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value expense mono" data-testid="total-expenses">
            {formatCurrency(dashboard?.total_expenses)}
          </div>
        </div>

        <div className="stat-card" data-testid="balance-card">
          <div className="stat-icon balance">
            <Wallet size={24} />
          </div>
          <div className="stat-label">Balance</div>
          <div className="stat-value balance mono" data-testid="balance">
            {formatCurrency(dashboard?.balance)}
          </div>
        </div>

        <div className="stat-card" data-testid="budget-card">
          <div className="stat-icon budget">
            <Target size={24} />
          </div>
          <div className="stat-label">Budget Remaining</div>
          <div className="stat-value mono" data-testid="remaining-budget">
            {formatCurrency(dashboard?.remaining_budget)}
          </div>
          {dashboard?.total_budget > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${
                    dashboard?.budget_used_percent >= 80 
                      ? 'danger' 
                      : dashboard?.budget_used_percent >= 60 
                        ? 'warning' 
                        : 'safe'
                  }`}
                  style={{ width: `${Math.min(dashboard?.budget_used_percent || 0, 100)}%` }}
                ></div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {dashboard?.budget_used_percent?.toFixed(1)}% used
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Transactions</h3>
        </div>

        {dashboard?.recent_transactions?.length > 0 ? (
          <div data-testid="recent-transactions">
            {dashboard.recent_transactions.map((transaction) => (
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
                  <div className="transaction-date">{formatDate(transaction.date)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Wallet size={48} />
            <h3>No transactions yet</h3>
            <p>Start tracking your income and expenses</p>
          </div>
        )}
      </div>
    </div>
  );
}
