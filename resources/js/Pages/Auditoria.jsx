import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { AgentesTab } from '../Components/Hub/AgentesTab';
import { LicenciasTab } from '../Components/Hub/LicenciasTab';
import { DesignacionesTab } from '../Components/Hub/DesignacionesTab';
import { TrasladosTab } from '../Components/Hub/TrasladosTab';
import { AuditoriaUnicaTab } from '../Components/Hub/AuditoriaUnicaTab';
import { AuditoriaTablerosTab } from '../Components/Hub/AuditoriaTablerosTab';

const Auditoria = () => {
  // Sync tab state with URL parameter '?tab='
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const validTabs = ['tableros', 'agentes', 'licencias', 'designaciones', 'traslados', 'auditoria-unica'];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
    }
    return 'tableros';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') || 'tableros';
      setActiveTab(tabParam);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const newUrl = `${window.location.pathname}?tab=${tabId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  // Tab configurations
  const tabs = [
    { id: 'tableros', label: '📊 Tableros de Auditoría', component: <AuditoriaTablerosTab /> },
    { id: 'agentes', label: '👥 Padrón de Agentes', component: <AgentesTab /> },
    { id: 'licencias', label: '📄 Padrón de Licencias', component: <LicenciasTab /> },
    { id: 'designaciones', label: '💼 Padrón de Designaciones', component: <DesignacionesTab /> },
    { id: 'auditoria-unica', label: '🔍 Auditoría Única', component: <AuditoriaUnicaTab /> },
    { id: 'traslados', label: '🗺️ Traslados y Distancias', component: <TrasladosTab /> },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <SIAMELayout>
      <Head title="Centro de Auditoría" />
      <div className="flex flex-col gap-6 w-full pb-10">
        


        {/* Tab Navigation Menu */}
        <div className="w-full bg-white/80 border border-gray-100 rounded-[28px] p-2 shadow-sm flex flex-wrap gap-2 items-center backdrop-blur-md">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-[20px] transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[#FE8204] text-white border border-[#FE8204] shadow-lg shadow-[#FE8204]/20'
                    : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="w-full animate-fade-in">
          {currentTab.component}
        </div>

      </div>
    </SIAMELayout>
  );
};

export default Auditoria;
