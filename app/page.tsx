'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type RfiCase = {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  dateReceived: number;
  severity: "High" | "Normal";
  status: "Waiting" | "Follow-Up Sent" | "Escalated to MM" | "Blocked" | "Resolved";
  deadline: number;
  createdAt: number;
  updatedAt: number;
};

export default function DashboardPage() {
  const [rfis, setRfis] = useState<RfiCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Only fetch unresolved/active cases ideally, but simple ordering for now
    const q = query(
      collection(db, 'rfis'),
      orderBy('deadline', 'asc'),
      limit(100)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const data: RfiCase[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as RfiCase));
      // Filter out resolved & blocked locally to avoid composite index requirements initially
      setRfis(data.filter(r => r.status !== 'Resolved' && r.status !== 'Blocked'));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/imap-sync', { method: 'POST' });
      const currentSync = await res.json();
      if (currentSync.error) alert(`Sync failed: ${currentSync.error}`);
      else alert(`Synced ${currentSync.count} new cases from IMAP!`);
    } catch (e) {
      alert("Error syncing IMAP");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8">Loading Cases...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active RFI Cases</h1>
          <p className="text-gray-500 mt-1">Track deadlines and follow-ups for ongoing RFIs.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync IMAP (MIAB)'}
          </button>
          <Link 
            href="/rfi/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manual Log
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {rfis.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-700">Inbox Zero!</p>
            <p>No active RFIs are currently pending.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rfis.map(rfi => (
              <RfiRow key={rfi.id} rfi={rfi} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RfiRow({ rfi }: { rfi: RfiCase }) {
  const isOverdue = isPast(rfi.deadline);
  
  const statusColors: Record<string, string> = {
    'Waiting': 'bg-amber-50 text-amber-700 border-amber-200',
    'Follow-Up Sent': 'bg-blue-50 text-blue-700 border-blue-200',
    'Escalated to MM': 'bg-red-50 text-red-700 border-red-200',
  };
  
  const urgencyClass = isOverdue 
    ? 'text-red-600 font-semibold' 
    : (rfi.severity === 'High' ? 'text-amber-600' : 'text-gray-500');

  return (
    <Link href={`/rfi/${rfi.id}`} className="block hover:bg-gray-50 transition-colors p-4 sm:p-6 group relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-semibold text-gray-900 truncate">{rfi.subject}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[rfi.status] || 'bg-gray-50 text-gray-700'}`}>
              {rfi.status}
            </span>
            {rfi.severity === 'High' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> High Severity
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-4">
            <span className="truncate">{rfi.customerName} &lt;{rfi.customerEmail}&gt;</span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span>Received: {format(rfi.dateReceived, 'MMM d, yyyy h:mm a')}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">Deadline</div>
            <div className={`text-sm flex items-center justify-end gap-1.5 ${urgencyClass}`}>
              <Clock className="w-4 h-4" />
              {isOverdue ? 'Overdue by ' : 'Due in '}
              {formatDistanceToNow(rfi.deadline)}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors hidden sm:block" />
        </div>

      </div>
    </Link>
  );
}
