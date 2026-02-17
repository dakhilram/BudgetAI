import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { aiService, paymentService } from '../services/api';
import { toast } from 'sonner';
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  Target, 
  FileText,
  Lock,
  CheckCircle,
  Brain,
  Download
} from 'lucide-react';

export default function AIInsights() {
  const { isPro } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleGetInsights = async () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.getInsights(3);
      setInsights(response.data);
      toast.success('AI insights generated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    setDownloadingPdf(true);
    try {
      const response = await aiService.downloadReport();
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget_report_${new Date().toISOString().slice(0, 7)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded!');
    } catch (error) {
      toast.error('Failed to download report');
    } finally {
      setDownloadingPdf(false);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="animate-fade-in" data-testid="ai-insights-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={32} color="#8b5cf6" />
              AI Insights
            </h1>
            <p className="page-subtitle">Get personalized financial advice powered by AI</p>
          </div>
          {isPro && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={handleDownloadReport}
                disabled={downloadingPdf}
                data-testid="download-report-btn"
              >
                <Download size={18} />
                {downloadingPdf ? 'Downloading...' : 'Download PDF'}
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleGetInsights}
                disabled={loading}
                data-testid="generate-insights-btn"
              >
                <Sparkles size={18} />
                {loading ? 'Analyzing...' : 'Generate Insights'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!isPro ? (
        // Non-Pro View - Locked Features
        <div className="card ai-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Lock size={40} color="#8b5cf6" />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Unlock AI-Powered Insights</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px' }}>
              Upgrade to Pro to get personalized financial insights, spending analysis, 
              budget recommendations, and more powered by advanced AI.
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              width: '100%',
              maxWidth: '600px',
              marginBottom: '2rem'
            }}>
              {[
                { icon: Brain, title: 'Smart Analysis', desc: 'AI analyzes your spending patterns' },
                { icon: Lightbulb, title: 'Savings Tips', desc: 'Personalized recommendations' },
                { icon: TrendingUp, title: 'Predictions', desc: 'Forecast future expenses' },
                { icon: FileText, title: 'PDF Reports', desc: 'Downloadable financial reports' },
              ].map((feature, index) => (
                <div 
                  key={index}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'left'
                  }}
                >
                  <feature.icon size={24} color="#8b5cf6" style={{ marginBottom: '0.75rem' }} />
                  <h4 style={{ marginBottom: '0.25rem', fontSize: '0.95rem' }}>{feature.title}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{feature.desc}</p>
                </div>
              ))}
            </div>

            <button 
              className="btn btn-primary btn-lg"
              onClick={() => setShowUpgradeModal(true)}
              data-testid="upgrade-btn"
            >
              <Sparkles size={20} />
              Upgrade to Pro - $9.99/month
            </button>
          </div>
        </div>
      ) : insights ? (
        // Pro View - With Insights
        <div>
          {/* Health Score */}
          <div className="card ai-card" style={{ marginBottom: '1.5rem' }}>
            <div className="health-score">
              <div style={{ position: 'relative' }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={getScoreColor(insights.health_score)}
                    strokeWidth="12"
                    strokeDasharray={`${(insights.health_score / 100) * 440} 440`}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div className="health-score-value">{insights.health_score}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>out of 100</div>
                </div>
              </div>
              <div className="health-score-label">Financial Health Score</div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">AI Analysis</h3>
              <Brain size={20} color="#8b5cf6" />
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {insights.insights}
            </p>
          </div>

          {/* Spending Patterns */}
          {insights.spending_patterns?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title">Spending Patterns</h3>
                <TrendingUp size={20} color="#3b82f6" />
              </div>
              {insights.spending_patterns.map((pattern, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: index < insights.spending_patterns.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{pattern.category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {formatCurrency(pattern.amount)}
                    </span>
                    <span style={{ 
                      color: 'var(--text-muted)', 
                      fontSize: '0.875rem',
                      minWidth: '50px',
                      textAlign: 'right'
                    }}>
                      {pattern.percentage?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Savings Suggestions */}
          {insights.savings_suggestions?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title">Savings Suggestions</h3>
                <Lightbulb size={20} color="#f59e0b" />
              </div>
              {insights.savings_suggestions.map((suggestion, index) => (
                <div key={index} className="insight-item">
                  <div className="insight-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                    <CheckCircle size={20} color="#f59e0b" />
                  </div>
                  <div className="insight-content">
                    <p className="insight-text">{suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Budget Recommendations */}
          {insights.budget_recommendations?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Budget Recommendations</h3>
                <Target size={20} color="#10b981" />
              </div>
              {insights.budget_recommendations.map((rec, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: index < insights.budget_recommendations.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{rec.category}</span>
                  <span className="mono" style={{ fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(rec.suggested_budget)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Pro View - No insights yet
        <div className="card ai-card">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Brain size={40} color="#8b5cf6" />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Ready to Analyze</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
              Click the button above to generate AI-powered insights based on your transaction history.
            </p>
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleGetInsights}
              disabled={loading}
            >
              <Sparkles size={20} />
              {loading ? 'Analyzing...' : 'Generate Insights'}
            </button>
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
                data-testid="checkout-btn"
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
