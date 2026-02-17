import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { format, subMonths } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar,
  Legend
} from 'recharts';
import { BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6b7280'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.875rem' }}>
            {entry.name}: ${entry.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { analytics, fetchAnalytics, loading } = useApp();
  const [initialized, setInitialized] = useState(false);
  const [startMonth, setStartMonth] = useState(format(subMonths(new Date(), 5), 'yyyy-MM'));
  const [endMonth, setEndMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (!initialized) {
      fetchAnalytics({ start_month: startMonth, end_month: endMonth });
      setInitialized(true);
    }
  }, [fetchAnalytics, startMonth, endMonth, initialized]);

  const handleFilterChange = () => {
    fetchAnalytics({ start_month: startMonth, end_month: endMonth });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare pie chart data
  const pieData = analytics?.category_breakdown?.map((item, index) => ({
    name: item.category,
    value: item.amount,
    color: COLORS[index % COLORS.length]
  })) || [];

  // Prepare line/bar chart data
  const monthlyData = analytics?.monthly_trend?.map(item => ({
    month: format(new Date(item.month + '-01'), 'MMM'),
    Income: item.income,
    Expense: item.expense
  })) || [];

  // Calculate totals
  const totalExpenses = pieData.reduce((sum, item) => sum + item.value, 0);

  if (loading && !analytics) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="analytics-page">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Visualize your spending patterns</p>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label className="form-label">From</label>
            <input
              type="month"
              className="form-input"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              data-testid="start-month-input"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label className="form-label">To</label>
            <input
              type="month"
              className="form-input"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              data-testid="end-month-input"
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleFilterChange}
            data-testid="apply-filter-btn"
          >
            Apply Filter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Pie Chart - Category Breakdown */}
        <div className="chart-container">
          <h3 className="chart-title">Spending by Category</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '1rem' }}>
                {pieData.slice(0, 5).map((item, index) => (
                  <div 
                    key={index}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.5rem 0',
                      borderBottom: index < pieData.length - 1 ? '1px solid var(--border)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '4px', 
                          backgroundColor: item.color 
                        }}
                      ></div>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {formatCurrency(item.value)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {((item.value / totalExpenses) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <BarChart3 size={48} />
              <p>No expense data for this period</p>
            </div>
          )}
        </div>

        {/* Line Chart - Monthly Trend */}
        <div className="chart-container">
          <h3 className="chart-title">Monthly Trend</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Income" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Expense" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <BarChart3 size={48} />
              <p>No data for this period</p>
            </div>
          )}
        </div>

        {/* Bar Chart - Income vs Expense */}
        <div className="chart-container" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">Income vs Expenses</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <BarChart3 size={48} />
              <p>No data for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
