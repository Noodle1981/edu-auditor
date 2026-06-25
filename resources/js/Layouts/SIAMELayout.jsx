import React from 'react';
import { Sidebar } from '../Components/Sidebar';
import { Header } from '../Components/Header';
import { AgentModal } from '../Components/AgentModal';

export default function SIAMELayout({ children, fullWidth = false, hideHeader = false }) {
  return (
    <div className="min-h-screen flex bg-gray-50/20">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        {!hideHeader && <Header />}

        {/* Dynamic Route Content */}
        <main className={fullWidth ? "flex-1 w-full flex flex-col relative" : "flex-1 p-10 max-w-[1400px] w-full mx-auto"}>
          {children}
        </main>
      </div>

      {/* Global Agent Modal */}
      <AgentModal />
    </div>
  );
}
