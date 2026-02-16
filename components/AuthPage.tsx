
import React, { useState } from 'react';
import { FileTextIcon, SunIcon, MoonIcon } from './icons';
import { User, UserRole, StaffDesignation } from '../types';
import { loginUser, registerUser } from '../services/authService';

interface AuthPageProps {
    onLoginSuccess: (user: User) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, isDarkMode, toggleDarkMode }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDemoInfo, setShowDemoInfo] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [designation, setDesignation] = useState<StaffDesignation>('faculty');

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setUsername('');
        setRole('student');
        setDesignation('faculty');
        setError(null);
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let user;
            if (isLoginView) {
                user = await loginUser(email, password);
            } else {
                if (!username) {
                  throw new Error("Username is required for signup.");
                }
                const finalDesignation = role === 'staff' ? designation : undefined;
                user = await registerUser(username, email, password, role, finalDesignation);
            }
            // Add a small delay to show the loading animation
            setTimeout(() => onLoginSuccess(user), 500);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const fillDemoCreds = (e: string) => {
        setEmail(e);
        setPassword('password123');
        setShowDemoInfo(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-background-light dark:bg-background-dark">
            {/* Animated Background Blobs */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob dark:bg-primary/20 dark:mix-blend-screen"></div>
            <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 dark:bg-purple-900/20 dark:mix-blend-screen"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 dark:bg-pink-900/20 dark:mix-blend-screen"></div>

            {/* Theme Toggle Button */}
            <div className="absolute top-6 right-6 z-20 animate-slide-down">
                <button
                    onClick={toggleDarkMode}
                    className="p-3 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-black/40 transition-all duration-300 shadow-lg hover:scale-110 focus:outline-none"
                    aria-label="Toggle dark mode"
                >
                    {isDarkMode ? (
                        <SunIcon className="w-6 h-6 text-yellow-400" />
                    ) : (
                        <MoonIcon className="w-6 h-6 text-gray-700" />
                    )}
                </button>
            </div>

            <div className="w-full max-w-md p-8 space-y-8 bg-white/80 dark:bg-secondary/80 backdrop-blur-lg rounded-3xl shadow-2xl m-4 border border-white/20 dark:border-gray-700 z-10 animate-slide-up">
                <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 animate-float">
                        <FileTextIcon className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-primary-light dark:to-white">
                        {isLoginView ? 'Welcome Back' : 'Join RepoCerti'}
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium">
                       {isLoginView ? 'Access your intelligent dashboard.' : 'Start your journey today.'}
                    </p>
                </div>
                
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {!isLoginView && (
                        <div className="animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                            <label htmlFor="username" className="block text-sm font-medium text-left text-gray-700 dark:text-gray-300 ml-1 mb-1">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none hover:bg-white dark:hover:bg-black/40"
                                placeholder="John Doe"
                            />
                        </div>
                    )}
                    <div className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
                        <label htmlFor="email" className="block text-sm font-medium text-left text-gray-700 dark:text-gray-300 ml-1 mb-1">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none hover:bg-white dark:hover:bg-black/40"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
                        <label htmlFor="password"  className="block text-sm font-medium text-left text-gray-700 dark:text-gray-300 ml-1 mb-1">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={isLoginView ? "current-password" : "new-password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none hover:bg-white dark:hover:bg-black/40"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {!isLoginView && (
                         <div className="animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
                            <label className="block text-sm font-medium text-left text-gray-700 dark:text-gray-300 ml-1 mb-1">I am a</label>
                            <div className="flex gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" value="student" checked={role === 'student'} onChange={() => setRole('student')} className="hidden peer"/>
                                    <div className="text-center py-3 rounded-xl border border-gray-200 dark:border-gray-600 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all duration-200 hover:bg-gray-50 dark:hover:bg-secondary-light/50">
                                        Student
                                    </div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" value="staff" checked={role === 'staff'} onChange={() => setRole('staff')} className="hidden peer"/>
                                    <div className="text-center py-3 rounded-xl border border-gray-200 dark:border-gray-600 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all duration-200 hover:bg-gray-50 dark:hover:bg-secondary-light/50">
                                        Staff
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Staff Designation Selection */}
                    {!isLoginView && role === 'staff' && (
                        <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
                            <label className="block text-sm font-medium text-left text-gray-700 dark:text-gray-300 ml-1 mb-1">Designation</label>
                            <div className="relative">
                                <select
                                    value={designation || 'faculty'}
                                    onChange={(e) => setDesignation(e.target.value as StaffDesignation)}
                                    className="block w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none appearance-none"
                                >
                                    <option value="faculty">Faculty</option>
                                    <option value="hod">HOD (Head of Department)</option>
                                    <option value="dean">Dean</option>
                                    <option value="principal">Principal</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700 dark:text-gray-300">
                                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <div className="animate-bounce text-sm text-red-500 text-center font-medium">{error}</div>}

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3.5 px-4 font-bold text-white bg-gradient-to-r from-primary to-primary-light rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            {loading ? 'Processing...' : (isLoginView ? 'Log In' : 'Create Account')}
                        </button>
                    </div>
                </form>

                {isLoginView && (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                        <button 
                            onClick={() => setShowDemoInfo(!showDemoInfo)}
                            className="text-xs text-primary/70 hover:text-primary font-medium flex items-center justify-center gap-1 mx-auto"
                        >
                            {showDemoInfo ? 'Hide Demo Logins' : 'Show Demo Logins'}
                        </button>
                        {showDemoInfo && (
                            <div className="mt-2 grid grid-cols-2 gap-2 animate-fadeIn">
                                {[
                                    { label: 'Student', email: 'student@demo.com' },
                                    { label: 'Faculty', email: 'faculty@demo.com' },
                                    { label: 'HOD', email: 'hod@demo.com' },
                                    { label: 'Principal', email: 'principal@demo.com' }
                                ].map(demo => (
                                    <button 
                                        key={demo.email}
                                        onClick={() => fillDemoCreds(demo.email)}
                                        className="text-[10px] p-2 bg-gray-50 dark:bg-black/20 rounded border border-gray-100 dark:border-gray-700 hover:border-primary transition-colors text-left"
                                    >
                                        <div className="font-bold text-primary">{demo.label}</div>
                                        <div className="truncate text-gray-500">{demo.email}</div>
                                    </button>
                                ))}
                                <div className="col-span-2 text-[10px] text-center text-gray-400 italic">PW: password123</div>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="text-center">
                    <button onClick={toggleView} className="text-sm font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light transition-colors duration-200 hover:underline">
                        {isLoginView ? 'Don\'t have an account? Sign up' : 'Already have an account? Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};
