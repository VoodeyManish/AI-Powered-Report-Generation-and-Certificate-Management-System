
import React from 'react';
import { SunIcon, MoonIcon, FileTextIcon, LogoutIcon } from './icons';
import { User } from '../types';

interface HeaderProps {
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: User;
  onToggleMenu?: () => void;
  children?: React.ReactNode;
}

// Added NavButton export to resolve import errors in StudentDashboard and StaffDashboard
export const NavButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            isActive 
            ? 'bg-primary text-white shadow-md' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
        {children}
    </button>
);

export const Header: React.FC<HeaderProps> = ({
  onLogout,
  isDarkMode,
  toggleDarkMode,
  user,
  onToggleMenu,
  children
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-secondary/90 backdrop-blur-md border-b dark:border-gray-800 transition-colors duration-300">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onToggleMenu && (
            <button 
              onClick={onToggleMenu}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group lg:hidden"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-7 w-7 text-primary animate-pulse-slow" />
            <h1 className="text-xl font-black tracking-tighter text-gray-900 dark:text-white">RepoCerti</h1>
          </div>

          {/* Navigation items rendered in header if provided (e.g. for student/staff dash) */}
          {children && (
            <nav className="hidden md:flex items-center gap-2 ml-4">
              {children}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs font-black uppercase text-primary tracking-widest">{user.username}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase">{user.designation || user.role}</span>
          </div>
          
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-700" />}
          </button>
          
          <button
            onClick={onLogout}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-all"
            aria-label="Logout"
          >
            <LogoutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
