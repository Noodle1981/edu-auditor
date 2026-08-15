import { createContext, useContext, useState, useEffect } from 'react';

const GlobalContext = createContext(undefined);

export const GlobalProvider = ({ children }) => {
  const [activeYear, setActiveYear] = useState(() => {
    return localStorage.getItem('activeYear') || '2026';
  });

  // Sync year selection to local storage
  useEffect(() => {
    localStorage.setItem('activeYear', activeYear);
  }, [activeYear]);

  return (
    <GlobalContext.Provider value={{
      activeYear,
      setActiveYear,
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
