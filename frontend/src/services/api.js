import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updatePin: (pin) => api.put('/auth/pin', { pin }),
  verifyPin: (pin) => api.post('/auth/verify-pin', { pin }),
};

// Transactions
export const transactionService = {
  getAll: (params) => api.get('/transactions', { params }),
  getOne: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

// Budgets
export const budgetService = {
  getAll: (params) => api.get('/budgets', { params }),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

// Categories
export const categoryService = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Dashboard & Analytics
export const dashboardService = {
  get: (month) => api.get('/dashboard', { params: { month } }),
  getAnalytics: (params) => api.get('/analytics', { params }),
};

// AI Insights (Pro)
export const aiService = {
  getInsights: (months = 3) => api.post('/ai/insights', { months }),
  categorize: (description) => api.post('/ai/categorize', null, { params: { description } }),
  downloadReport: (month) => api.get('/ai/report/pdf', { params: { month }, responseType: 'blob' }),
};

// Payments
export const paymentService = {
  createCheckout: (originUrl) => api.post('/payments/checkout', { origin_url: originUrl }),
  checkStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
};

// Export
export const exportService = {
  csv: (month) => api.get('/export/csv', { params: { month }, responseType: 'blob' }),
};

export default api;
