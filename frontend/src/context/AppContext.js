import React, { createContext, useContext, useState, useCallback } from 'react';
import { transactionService, budgetService, categoryService, dashboardService } from '../services/api';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Transactions
  const fetchTransactions = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await transactionService.getAll({
        ...params,
        month: params.month || currentMonth,
      });
      setTransactions(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  const createTransaction = async (data) => {
    const response = await transactionService.create(data);
    setTransactions((prev) => [response.data, ...prev]);
    return response.data;
  };

  const updateTransaction = async (id, data) => {
    const response = await transactionService.update(id, data);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? response.data : t))
    );
    return response.data;
  };

  const deleteTransaction = async (id) => {
    await transactionService.delete(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Budgets
  const fetchBudgets = useCallback(async (month) => {
    setLoading(true);
    try {
      const response = await budgetService.getAll({ month: month || currentMonth });
      setBudgets(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  const createBudget = async (data) => {
    const response = await budgetService.create(data);
    setBudgets((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateBudget = async (id, data) => {
    const response = await budgetService.update(id, data);
    setBudgets((prev) => prev.map((b) => (b.id === id ? response.data : b)));
    return response.data;
  };

  const deleteBudget = async (id) => {
    await budgetService.delete(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  // Categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getAll();
      setCategories(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }, []);

  const createCategory = async (data) => {
    const response = await categoryService.create(data);
    setCategories((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateCategory = async (id, data) => {
    const response = await categoryService.update(id, data);
    setCategories((prev) => prev.map((c) => (c.id === id ? response.data : c)));
    return response.data;
  };

  const deleteCategory = async (id) => {
    await categoryService.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Dashboard
  const fetchDashboard = useCallback(async (month) => {
    setLoading(true);
    try {
      const response = await dashboardService.get(month || currentMonth);
      setDashboard(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Analytics
  const fetchAnalytics = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await dashboardService.getAnalytics(params);
      setAnalytics(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    // State
    transactions,
    budgets,
    categories,
    dashboard,
    analytics,
    loading,
    currentMonth,
    setCurrentMonth,
    // Transaction methods
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    // Budget methods
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    // Category methods
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    // Dashboard/Analytics
    fetchDashboard,
    fetchAnalytics,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
