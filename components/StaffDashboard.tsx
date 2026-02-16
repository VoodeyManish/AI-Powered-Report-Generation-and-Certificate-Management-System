
import React, { useState } from 'react';
import { Header, NavButton } from './Header';
import { ReportGenerator } from './ReportGenerator';
import { FileRepository } from './FileRepository';
import { ActiveModule, User } from '../types';

interface StaffDashboardProps {
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onLogout, isDarkMode, toggleDarkMode, user }) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>(ActiveModule.Report);

  return (
    <>
      <Header 
        user={user}
        onLogout={onLogout}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      >
        <NavButton
            isActive={activeModule === ActiveModule.Report}
            onClick={() => setActiveModule(ActiveModule.Report)}
        >
            Report Generator
        </NavButton>
        <NavButton
            isActive={activeModule === ActiveModule.Repository}
            onClick={() => setActiveModule(ActiveModule.Repository)}
        >
            File Repository
        </NavButton>
      </Header>
      <main className="p-4 sm:p-6 md:p-8 min-h-[calc(100vh-4rem)]">
        <div key={activeModule} className="animate-fade-in">
            {activeModule === ActiveModule.Report && <ReportGenerator />}
            {activeModule === ActiveModule.Repository && <FileRepository />}
        </div>
      </main>
    </>
  );
};
