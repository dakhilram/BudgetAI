import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Lock, Wallet } from 'lucide-react';

export default function LockScreen() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { verifyPin, logout } = useAuth();

  const handlePinChange = (index, value) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 3) {
      const fullPin = [...newPin.slice(0, 3), value].join('');
      handleVerify(fullPin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async (pinCode) => {
    setLoading(true);
    try {
      await verifyPin(pinCode);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Invalid PIN');
      setPin(['', '', '', '']);
      document.getElementById('pin-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-icon">
        <Lock size={40} color="white" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Wallet size={32} color="#3b82f6" />
        <h1 style={{ fontSize: '1.75rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          BudgetAI
        </h1>
      </div>

      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Enter PIN</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Enter your 4-digit PIN to unlock</p>

      <div className="pin-input-container">
        {pin.map((digit, index) => (
          <input
            key={index}
            id={`pin-${index}`}
            type="password"
            maxLength={1}
            className="pin-digit"
            value={digit}
            onChange={(e) => handlePinChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={loading}
            autoFocus={index === 0}
            data-testid={`pin-input-${index}`}
          />
        ))}
      </div>

      {loading && (
        <div style={{ marginTop: '1rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      )}

      <button
        onClick={logout}
        className="btn btn-ghost"
        style={{ marginTop: '2rem' }}
        data-testid="lock-logout-btn"
      >
        Sign out instead
      </button>
    </div>
  );
}
