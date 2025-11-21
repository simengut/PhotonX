
import React, { useState } from 'react';
import { auth } from './services/firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { OfflineProvider } from './contexts/OfflineContext';
import MainRouter from './components/MainRouter';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import { Mail, Lock, AlertCircle, UserPlus, LogIn, Activity } from 'lucide-react';
import { useUserJot } from './hooks/useUserJot';

const AuthScreen: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [logoError, setLogoError] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (isRegistering && password !== confirmPassword) {
        setAuthError("Passwords do not match");
        return;
    }

    try {
      if (isRegistering) {
        await auth.createUserWithEmailAndPassword(email, password);
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F7F5] font-sans text-[#37352F]">
        <div className="m-auto w-full max-w-md p-8">
          <div className="bg-white border border-[#E9E9E7] rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#37352F] text-white mb-4 shadow-sm overflow-hidden">
                  {!logoError ? (
                    <img
                        src="favicon.png?v=2"
                        alt="Logo"
                        className="w-full h-full object-cover"
                        onError={() => setLogoError(true)}
                    />
                  ) : (
                    <Activity size={48} className="text-white" />
                  )}
              </div>
              <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">LaserSpeed Pro</h1>
              <p className="text-[#9B9A97] text-sm">Professional athletics measurement.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97]" size={16}/>
                    <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="coach@example.com"
                        className="w-full pl-10 pr-4 py-2.5 border border-[#E9E9E7] rounded-lg text-sm outline-none focus:border-[#37352F] transition-all bg-[#F7F7F5] focus:bg-white"
                    />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97]" size={16}/>
                    <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 border border-[#E9E9E7] rounded-lg text-sm outline-none focus:border-[#37352F] transition-all bg-[#F7F7F5] focus:bg-white"
                    />
                </div>
              </div>

              {isRegistering && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                    <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-1">Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97]" size={16}/>
                        <input 
                            type="password" 
                            required 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-2.5 border border-[#E9E9E7] rounded-lg text-sm outline-none focus:border-[#37352F] transition-all bg-[#F7F7F5] focus:bg-white"
                        />
                    </div>
                </div>
              )}

              {authError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">
                    <AlertCircle size={16} />
                    {authError}
                </div>
              )}

              <button type="submit" className="w-full bg-[#37352F] text-white font-medium py-2.5 rounded-lg hover:bg-black transition-colors shadow-sm mt-2 flex items-center justify-center gap-2">
                {isRegistering ? <UserPlus size={18}/> : <LogIn size={18}/>}
                {isRegistering ? 'Create Account' : 'Log In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E9E9E7] flex flex-col gap-3">
                <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#E9E9E7] rounded-lg text-sm font-medium text-[#37352F] hover:bg-[#F7F7F5] transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12.5S6.42 23 12.1 23c5.83 0 8.84-4.15 8.84-11.9z"/></svg>
                        Google
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#E9E9E7] rounded-lg text-sm font-medium text-[#37352F] hover:bg-[#F7F7F5] transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35c-1.09-.46-2.09-.48-3.24 0c-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8c1.18-.24 2.31-.93 3.57-.84c1.51.12 2.65.64 3.4 1.63c-3.12 1.88-2.68 7.44.85 8.99c-.34 1.05-.81 2.09-1.49 3.11zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25c.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                        Apple
                    </button>
                </div>
                <div className="text-center">
                     <button 
                        type="button" 
                        onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                        className="text-xs text-[#9B9A97] hover:text-[#37352F] hover:underline transition-colors"
                     >
                        {isRegistering ? "Already have an account? Log in" : "Don't have an account? Sign Up"}
                     </button>
                </div>
            </div>
          </div>
        </div>
      </div>
  );
};

const AuthWrapper = () => {
    const { user, loading } = useAuth();

    // Initialize UserJot with user identification
    useUserJot(user);

    if (loading) return <div className="flex items-center justify-center h-screen bg-white"><Activity className="animate-spin text-[#37352F]" /></div>;
    if (!user) return <AuthScreen />;

    // If logged in, load data
    return (
        <DataProvider>
            <OfflineIndicator />
            <InstallPrompt />
            <MainRouter />
        </DataProvider>
    );
};

const App: React.FC = () => {
  return (
    <OfflineProvider>
      <AuthProvider>
          <AuthWrapper />
      </AuthProvider>
    </OfflineProvider>
  );
}

export default App;
