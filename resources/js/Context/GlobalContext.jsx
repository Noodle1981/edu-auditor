import React, { createContext, useContext, useState, useEffect } from 'react';

const GlobalContext = createContext(undefined);

export const GlobalProvider = ({ children }) => {
  const [activeYear, setActiveYear] = useState(() => {
    return localStorage.getItem('activeYear') || '2026';
  });
  const [selectedAgentDni, setSelectedAgentDni] = useState(null);

  // Sync year selection to local storage
  useEffect(() => {
    localStorage.setItem('activeYear', activeYear);
  }, [activeYear]);

  const openAgentModal = (dni) => {
    setSelectedAgentDni(dni);
  };

  const closeAgentModal = () => {
    setSelectedAgentDni(null);
  };
  return (
    <GlobalContext.Provider value={{
      activeYear,
      setActiveYear,
      selectedAgentDni,
      setSelectedAgentDni,
      openAgentModal,
      closeAgentModal
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
