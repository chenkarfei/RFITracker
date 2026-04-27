'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Settings, Trash2, Plus, Mail, Shield, Server, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ImapConfig = {
  id: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  label: string;
  createdAt: number;
};

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ImapConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [label, setLabel] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(993);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'imap_configs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: ImapConfig[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as ImapConfig));
      setConfigs(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'imap_configs'), {
        label,
        host,
        port,
        user,
        pass,
        createdAt: Date.now()
      });
      setShowForm(false);
      setLabel('');
      setHost('');
      setPort(993);
      setUser('');
      setPass('');
    } catch (err) {
      alert('Error saving config');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this mailbox?')) return;
    try {
      await deleteDoc(doc(db, 'imap_configs', id));
    } catch (err) {
      alert('Error deleting');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-400" />
            IMAP Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage multiple mailboxes to monitor for RFI emails.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Mailbox
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Add New Mailbox</h2>
          <form onSubmit={handleAddConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Friendly Label (e.g. &quot;Main Support&quot;)</label>
              <input 
                required
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Support Inbox"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host</label>
              <input 
                required
                value={host}
                onChange={e => setHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="mail.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input 
                type="number"
                required
                value={port}
                onChange={e => setPort(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
              <input 
                required
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                required
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button 
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Configured Mailboxes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {configs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Mail className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p>No mailboxes configured yet.</p>
            </div>
          ) : (
            configs.map(config => (
              <div key={config.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.label}</h3>
                    <div className="text-sm text-gray-500 flex items-center gap-3">
                      <span>{config.user}</span>
                      <span className="text-gray-300">•</span>
                      <span>{config.host}:{config.port}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(config.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-sm text-amber-800">
        <Shield className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-1">Security Note</p>
          <p>Passwords are stored in Firestore. In a production environment, ensure your Firestore rules strictly restrict access to these configurations to authorized admin users only.</p>
        </div>
      </div>
    </div>
  );
}
