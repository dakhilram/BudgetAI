import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/api';
import { toast } from 'sonner';
import { CheckCircle, Sparkles, Loader } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { upgradeToPro } = useAuth();
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const pollingRef = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      navigate('/settings');
      return;
    }

    const pollPaymentStatus = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      const maxAttempts = 10;
      let currentAttempt = 0;

      const checkStatus = async () => {
        try {
          const response = await paymentService.checkStatus(sessionId);
          
          if (response.data.payment_status === 'paid') {
            setStatus('success');
            upgradeToPro();
            toast.success('Welcome to Pro! Enjoy AI-powered insights.');
            return true;
          } else if (response.data.status === 'expired') {
            setStatus('failed');
            toast.error('Payment session expired');
            return true;
          }
          return false;
        } catch (error) {
          console.error('Error checking payment:', error);
          return false;
        }
      };

      const poll = async () => {
        if (currentAttempt >= maxAttempts) {
          setStatus('timeout');
          return;
        }

        const done = await checkStatus();
        if (!done) {
          currentAttempt++;
          setAttempts(currentAttempt);
          setTimeout(poll, 2000);
        }
      };

      poll();
    };

    pollPaymentStatus();
  }, [searchParams, navigate, upgradeToPro]);

  const handleContinue = () => {
    navigate('/ai-insights');
  };

  const handleRetry = () => {
    navigate('/settings');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '2rem'
    }}>
      <div className="card" style={{
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center',
        padding: '3rem'
      }}>
        {status === 'checking' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Loader size={40} color="#8b5cf6" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Processing Payment</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Please wait while we confirm your payment...
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
              Attempt {attempts + 1}/10
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Welcome to Pro!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Your payment was successful. You now have access to all Pro features including AI-powered insights!
            </p>
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleContinue}
              style={{ width: '100%' }}
              data-testid="continue-btn"
            >
              <Sparkles size={20} />
              Explore AI Insights
            </button>
          </>
        )}

        {(status === 'failed' || status === 'timeout') && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <span style={{ fontSize: '2.5rem' }}>!</span>
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Payment Issue</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {status === 'timeout' 
                ? 'We couldn\'t confirm your payment. If you were charged, please contact support.'
                : 'Your payment session has expired. Please try again.'
              }
            </p>
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleRetry}
              style={{ width: '100%' }}
            >
              Go Back to Settings
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
