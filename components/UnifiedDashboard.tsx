
import React, { useState, memo } from 'react';
import { Header } from './Header';
import { Dashboard } from './Dashboard';
import { ReportGenerator } from './ReportGenerator';
import { CertificateExtractor } from './CertificateExtractor';
import { FileRepository } from './FileRepository';
import { ActiveModule, User } from '../types';
import { DashboardIcon, FileTextIcon, SaveIcon, ImageIcon } from './icons';

interface UnifiedDashboardProps {
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: User;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ onLogout, isDarkMode, toggleDarkMode, user }) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>(ActiveModule.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: ActiveModule.Dashboard, label: 'My Dashboard', icon: <DashboardIcon className="w-5 h-5" /> },
    { id: ActiveModule.Report, label: 'Report Generator', icon: <FileTextIcon className="w-5 h-5" /> },
    { id: ActiveModule.Certificate, label: 'Certificate Extractor', icon: <ImageIcon className="w-5 h-5" /> },
    { id: ActiveModule.Repository, label: 'File Repository', icon: <SaveIcon className="w-5 h-5" /> },
  ];

  const handleTabClick = (tabId: ActiveModule) => {
    setActiveModule(tabId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Menu */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-secondary border-r dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3 border-b dark:border-gray-800">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileTextIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter">RepoCerti</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Main Control</p>
            </div>
          </div>

          <nav className="flex-grow p-4 space-y-2 mt-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-sm tracking-tight transition-all group ${activeModule === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <div className={`transition-transform duration-300 ${activeModule === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 text-center">
               <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Signed in as</p>
               <p className="text-sm font-bold truncate">{user.username}</p>
               <p className="text-[10px] text-primary font-black uppercase mt-1 tracking-widest">{user.designation || user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        <Header 
          user={user} 
          onLogout={onLogout} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode}
          onToggleMenu={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-grow p-4 lg:p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div key={activeModule} className="animate-fade-in">
                {activeModule === ActiveModule.Dashboard && <Dashboard />}
                {activeModule === ActiveModule.Report && <ReportGenerator />}
                {activeModule === ActiveModule.Certificate && <CertificateExtractor />}
                {activeModule === ActiveModule.Repository && <FileRepository />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
