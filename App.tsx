
import React, { useState, useEffect, useCallback } from 'react';
import { AuthPage } from './components/AuthPage';
import { UnifiedDashboard } from './components/UnifiedDashboard';
import { User } from './types';
import { getCurrentUser, logoutUser } from './services/authService';
import { FileTextIcon } from './components/icons';

// Define the interface for AI Studio integration
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fixed: Remove readonly modifier to match TypeScript global interface requirements
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [needsApiKey, setNeedsApiKey] = useState<boolean>(false);

  // Check if API Key is missing or invalid
  const checkApiKeyStatus = useCallback(async () => {
    // Standard process.env.API_KEY check
    const envKey = process.env.API_KEY;
    const isEnvKeyMissing = !envKey || envKey === "" || envKey === "undefined" || envKey === "null";

    if (isEnvKeyMissing) {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasSelected = await window.aistudio.hasSelectedApiKey();
        setNeedsApiKey(!hasSelected);
      } else {
        setNeedsApiKey(true);
      }
    } else {
      // Key is present in process.env.API_KEY
      setNeedsApiKey(false);
    }
  }, []);

  useEffect(() => {
    // Demo users are seeded by backend on initialization
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const handleLoginSuccess = (user: User) => setCurrentUser(user);
  const handleLogout = () => { logoutUser(); setCurrentUser(null); };

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      setTimeout(checkApiKeyStatus, 1000);
    } else {
      alert("API Key Selection is unavailable. Please ensure the API_KEY is set correctly.");
    }
  };

  /**
   * Logs the user out and resets the application state.
   */
  const handleMasterReset = () => {
    if (window.confirm("CRITICAL: This will log you out and clear your session. Are you absolutely sure?")) {
      logoutUser();
      window.location.reload();
    }
  };

  // UI for Missing API Key
  if (needsApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background-light dark:bg-background-dark">
        <div className="max-w-md w-full text-center space-y-10 animate-scale-in">
          <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-float">
            <FileTextIcon className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tighter">AI Service Required</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              RepoCerti requires a valid Google Gemini API Key. 
            </p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-2xl hover:bg-primary-dark transition-all active:scale-95 text-lg"
            >
              Connect Gemini API
            </button>
            <button 
              onClick={handleMasterReset}
              className="w-full py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
            >
              Clear All Data & Reset App
            </button>
          </div>

          <div className="pt-8 border-t dark:border-gray-800">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Please use a key from a paid GCP project. 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">Docs</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-text-light dark:text-text-dark bg-background-light dark:bg-background-dark transition-colors duration-300 font-sans">
      {!currentUser ? (
        <AuthPage 
          onLoginSuccess={handleLoginSuccess} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      ) : (
        <UnifiedDashboard 
          user={currentUser}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}
      
      {/* Global Data Wipe Button */}
      <button 
        onClick={handleMasterReset}
        title="Wipe application data"
        className="fixed bottom-6 left-6 p-4 bg-white/20 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all z-[100] border dark:border-gray-800 shadow-xl group"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="absolute left-full ml-4 py-2 px-4 bg-red-500 text-white text-[10px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Clear All Data
        </span>
      </button>
    </div>
  );
};

export default App;
