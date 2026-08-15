import { Sidebar } from '../Components/Sidebar';
import { Header } from '../Components/Header';

export default function SIAMELayout({ children, fullWidth = false, hideHeader = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Banner Header (Full Width & Fixed Top) */}
      {!hideHeader && <Header />}

      {/* Body with Sidebar & Main Content */}
      <div className={`flex flex-1 min-w-0 relative ${!hideHeader ? 'pt-[60px]' : ''}`}>
        {/* Sidebar Navigation (Fixed Left under Header) */}
        <Sidebar />

        {/* Dynamic Route Content */}
        <main className={fullWidth ? "flex-1 w-full flex flex-col relative" : "flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto"}>
          {children}
        </main>
      </div>
    </div>
  );
}
