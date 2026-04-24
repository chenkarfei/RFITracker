'use client';

import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Mail, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import './globals.css';

export default function ClientWrapper({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => {
    signOut(auth);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading tracking system...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md w-full text-center">
          <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">RFI Tracker</h1>
          <p className="text-gray-500 mb-8">Internal Escalation & Follow-Up Tracking</p>
          <button 
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            RFI Tracker
          </div>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-1 px-4">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-md font-medium text-sm">
            <Clock className="w-4 h-4" />
            Active RFIs
          </Link>
          <Link href="/blocked" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors">
            <ShieldAlert className="w-4 h-4" />
            Blocked Customers
          </Link>
        </div>
        <div className="p-4 border-t border-gray-100 mt-auto">
          <div className="text-sm font-medium text-gray-900 truncate">{user.email}</div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 mt-2 text-left w-full">Sign out</button>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        {children}
      </main>
    </div>
  );
}
