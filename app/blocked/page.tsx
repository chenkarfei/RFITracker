'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ShieldAlert, Ban } from 'lucide-react';

type BlockedCustomer = {
  id: string;
  email: string;
  blockedAt: number;
  reason: string;
  staffId: string;
};

export default function BlockedCustomersPage() {
  const [blocked, setBlocked] = useState<BlockedCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'blocked_customers'),
      orderBy('blockedAt', 'desc'),
      limit(100)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const data: BlockedCustomer[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as BlockedCustomer));
      setBlocked(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-red-100 p-2 rounded-lg">
          <Ban className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blocked Customers</h1>
          <p className="text-gray-500 mt-1">Customers confirmed blocked by MM. New RFIs from these emails flag automatically.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {blocked.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-700">No Blocked Customers</p>
            <p>You have not escalated and blocked any customers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Blocked</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blocked.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(customer.blockedAt, 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
