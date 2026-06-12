import React, { createContext, useContext, useState, useEffect } from 'react';

const GlobalContext = createContext(undefined);

export const GlobalProvider = ({ children }) => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [traslados, setTraslados] = useState(null);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingTraslados, setLoadingTraslados] = useState(false);

  const [selectedAgentDni, setSelectedAgentDni] = useState(null);

  const fetchStats = async (force = false) => {
    if (stats && !force) return;
    setLoadingStats(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAnalytics = async (force = false) => {
    if (analytics && !force) return;
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/analytics/advanced');
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error('Error fetching advanced analytics:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchTraslados = async (force = false) => {
    if (traslados && !force) return;
    setLoadingTraslados(true);
    try {
      const res = await fetch('/api/traslados/audit');
      const data = await res.json();
      setTraslados(data);
    } catch (e) {
      console.error('Error fetching traslados audit:', e);
    } finally {
      setLoadingTraslados(false);
    }
  };

  const openAgentModal = (dni) => {
    setSelectedAgentDni(dni);
  };

  const closeAgentModal = () => {
    setSelectedAgentDni(null);
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchStats(true),
      fetchAnalytics(true),
      fetchTraslados(true)
    ]);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <GlobalContext.Provider value={{
      stats,
      analytics,
      traslados,
      loadingStats,
      loadingAnalytics,
      loadingTraslados,
      selectedAgentDni,
      setSelectedAgentDni,
      openAgentModal,
      closeAgentModal,
      refreshAll,
      fetchStats,
      fetchAnalytics,
      fetchTraslados
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
