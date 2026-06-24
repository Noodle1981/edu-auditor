import React, { createContext, useContext, useState, useEffect } from 'react';

const GlobalContext = createContext(undefined);

export const GlobalProvider = ({ children }) => {
  const [activeYear, setActiveYear] = useState(() => {
    return localStorage.getItem('activeYear') || '2026';
  });
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [traslados, setTraslados] = useState(null);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingTraslados, setLoadingTraslados] = useState(false);

  const [selectedAgentDni, setSelectedAgentDni] = useState(null);

  const fetchStats = async (force = false) => {
    if (stats && !force) return;
    if (!stats) {
      setLoadingStats(true);
    }
    try {
      const res = await fetch(`/api/stats?year=${activeYear}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAnalytics = async (force = false) => {
    if (analytics && !force) return;
    if (!analytics) {
      setLoadingAnalytics(true);
    }
    try {
      const res = await fetch(`/api/analytics/advanced?year=${activeYear}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error('Error fetching advanced analytics:', e);
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchTraslados = async (force = false) => {
    if (traslados && !force) return;
    if (!traslados) {
      setLoadingTraslados(true);
    }
    try {
      const res = await fetch(`/api/traslados/audit?year=${activeYear}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setTraslados(data);
    } catch (e) {
      console.error('Error fetching traslados audit:', e);
      setTraslados(null);
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

  // Sync year selection to local storage and refresh data on change
  useEffect(() => {
    localStorage.setItem('activeYear', activeYear);
    refreshAll();
  }, [activeYear]);

  return (
    <GlobalContext.Provider value={{
      activeYear,
      setActiveYear,
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
