import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  PiggyBank, 
  BarChart3, 
  Sparkles, 
  Settings, 
  LogOut,
  Wallet,
  Plus
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
  { path: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/ai-insights', icon: Sparkles, label: 'AI Insights', pro: true },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const Layout = () => {
  const { user, logout, isPro } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Wallet size={32} color="#3b82f6" />
          <h1>BudgetAI</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.pro && !isPro && (
                <span className="pro-badge">PRO</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">
                {user?.name}
                {isPro && <span className="pro-badge">PRO</span>}
              </div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button 
            className="nav-item" 
            onClick={handleLogout}
            style={{ marginTop: '1rem', width: '100%', border: 'none', cursor: 'pointer' }}
            data-testid="sidebar-logout-btn"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={24} />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <ArrowUpDown size={24} />
            <span>History</span>
          </NavLink>
          <button 
            className="mobile-add-btn"
            onClick={() => navigate('/transactions?add=true')}
            data-testid="mobile-add-btn"
          >
            <Plus size={28} />
          </button>
          <NavLink
            to="/analytics"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart3 size={24} />
            <span>Stats</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={24} />
            <span>More</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
