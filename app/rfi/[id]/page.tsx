'use client';

import { use, useEffect, useState, useRef } from 'react';
import { doc, getDoc, onSnapshot, collection, query, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ArrowLeft, Clock, History, Send, Link as LinkIcon, Paperclip, FileText, AlertTriangle, Printer, Ban } from 'lucide-react';
import Link from 'next/link';

type RfiCase = {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  dateReceived: number;
  severity: string;
  status: string;
  deadline: number;
  createdAt: number;
  updatedAt: number;
};

type FollowUp = {
  id: string;
  type: string;
  notes: string;
  date: number;
  staffId: string;
  proofUrl?: string; // We'll store a small base64 or a mock url
};

export default function RfiDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [rfi, setRfi] = useState<RfiCase | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Follow Up Form state
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpType, setFollowUpType] = useState('email');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubRfi = onSnapshot(doc(db, 'rfis', id), (docSnap) => {
      if (docSnap.exists()) {
        setRfi({ id: docSnap.id, ...docSnap.data() } as RfiCase);
      } else {
        setRfi(null);
      }
      setLoading(false);
    });

    const q = query(collection(db, `rfis/${id}/followups`), orderBy('date', 'desc'));
    const unsubFollowUps = onSnapshot(q, (snap) => {
      const data: FollowUp[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as FollowUp));
      setFollowUps(data);
    });

    return () => {
      unsubRfi();
      unsubFollowUps();
    };
  }, [id]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSubmitting(true);
    
    try {
      let proofUrl = '';
      if (proofFile) {
        // Since Firebase storage isn't active, we use a FileReader max 800kb or mock
        if (proofFile.size < 800000) {
          const reader = new FileReader();
          proofUrl = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(proofFile);
          });
        } else {
          alert('File too large for this preview. Storing a placeholder.');
          proofUrl = `https://dummyimage.com/600x400/eeeeee/888888.png&text=Proof+Mock+for+` + encodeURIComponent(proofFile.name);
        }
      }

      const followupRef = doc(collection(db, `rfis/${id}/followups`));
      
      const followupData: any = {
        type: followUpType,
        notes: followUpNotes,
        date: Date.now(),
        staffId: auth.currentUser.uid
      };
      if (proofUrl) followupData.proofUrl = proofUrl;

      // Ensure write order: Create subdocument, then parent document updates
      await setDoc(followupRef, followupData);

      // Parent update: Status "Follow-Up Sent", deadline to +48 hours
      const msInHour = 60 * 60 * 1000;
      await updateDoc(doc(db, 'rfis', id), {
        status: 'Follow-Up Sent',
        deadline: Date.now() + (48 * msInHour),
        updatedAt: Date.now()
      });

      setShowFollowUpForm(false);
      setFollowUpNotes('');
      setProofFile(null);
    } catch (err: any) {
      alert(`Error saving follow up: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!confirm("Are you sure you want to escalate this case to MM?")) return;
    try {
      await updateDoc(doc(db, 'rfis', id), {
        status: 'Escalated to MM',
        updatedAt: Date.now()
      });
    } catch (e: any) {
      alert(`Error escalating: ${e.message}`);
    }
  };

  const handleReportGeneration = () => {
    window.print();
  };
  
  const handleBlockCustomer = async () => {
    if (!rfi || !auth.currentUser) return;
    if (!confirm(`Mark ${rfi.customerEmail} as permanently blocked? This means future RFIs from them will be flagged.`)) return;
    try {
      // Create block doc
      const blockRef = doc(collection(db, 'blocked_customers'));
      await setDoc(blockRef, {
        email: rfi.customerEmail,
        blockedAt: Date.now(),
        reason: 'Repeated non-response',
        staffId: auth.currentUser.uid
      });
      // Mark current RFI as blocked
      await updateDoc(doc(db, 'rfis', id), {
        status: 'Blocked',
        updatedAt: Date.now()
      });
    } catch (e: any) {
      alert(`Error blocking: ${e.message}`);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!rfi) return <div className="p-8 text-red-500">Case not found.</div>;

  const isOverdue = isPast(rfi.deadline);

  return (
    <div className="p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
      
      {/* Non-print controls */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="flex items-center gap-3">
          {rfi.status !== 'Resolved' && rfi.status !== 'Blocked' && (
            <>
              <button 
                onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showFollowUpForm ? 'Cancel Follow-Up' : 'Record Follow-Up'}
              </button>
              <button 
                onClick={handleEscalate}
                className="bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors"
              >
                Escalate to MM
              </button>
            </>
          )}
          {rfi.status === 'Escalated to MM' && (
            <>
              <button 
                onClick={handleReportGeneration}
                className="bg-blue-600 text-white flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
               >
                 <Printer className="w-4 h-4"/> Export Report (PDF)
              </button>
              <button 
                onClick={handleBlockCustomer}
                className="bg-red-600 text-white flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                 <Ban className="w-4 h-4"/> Block Customer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 print:border-none print:shadow-none">
        
        <div className="p-6 border-b border-gray-100 bg-gray-50 print:bg-white flex justify-between items-start">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Case ID: {rfi.id}</div>
            <h1 className="text-2xl font-bold text-gray-900">{rfi.subject}</h1>
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{rfi.customerName}</span> · {rfi.customerEmail}
            </div>
          </div>
          
          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-sm font-medium border bg-white text-gray-700 block mb-2">
              Status: {rfi.status}
            </span>
            <div className="text-sm text-gray-500 flex items-center justify-end gap-1.5">
              <Clock className="w-4 h-4" />
              {isOverdue ? 'Overdue target by ' : 'Due in '}
              {formatDistanceToNow(rfi.deadline)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Set for {format(rfi.deadline, 'MMM d, h:mm a')}
            </div>
          </div>
        </div>

        {/* Dynamic Warning for Blocked or Escalated Cases */}
        {rfi.status === 'Escalated to MM' && (
          <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-amber-800 font-medium text-sm">Escalated to MM</h3>
              <p className="text-amber-700 text-sm mt-1">This case has missed multiple deadlines or was manually escalated. A PDF report can be exported for Management Review.</p>
            </div>
          </div>
        )}
        
        {rfi.status === 'Blocked' && (
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-start gap-3">
            <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium text-sm">Customer Blocked</h3>
              <p className="text-red-700 text-sm mt-1">Management has confirmed the block for this customer. Further correspondence is flagged.</p>
            </div>
          </div>
        )}

        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" /> Case Timeline
          </h2>
          
          <div className="relative border-l border-gray-200 ml-3 space-y-8 pb-4">
            
            <div className="relative pl-6">
              <div className="bg-blue-600 w-3 h-3 rounded-full absolute -left-[6px] top-1.5 ring-4 ring-white" />
              <div className="text-sm text-gray-500 mb-1">{format(rfi.dateReceived, 'MMM d, yyyy h:mm a')}</div>
              <div className="font-medium text-gray-900">RFI Received</div>
              <p className="text-sm text-gray-600 mt-1">Logged into tracking system with {rfi.severity} severity.</p>
            </div>

            {followUps.map(fu => (
              <div key={fu.id} className="relative pl-6">
                <div className="bg-gray-400 w-3 h-3 rounded-full absolute -left-[6px] top-1.5 ring-4 ring-white" />
                <div className="text-sm text-gray-500 mb-1">{format(fu.date, 'MMM d, yyyy h:mm a')}</div>
                <div className="font-medium text-gray-900 capitalize">Follow-Up: {fu.type}</div>
                <p className="text-sm text-gray-600 mt-1">{fu.notes}</p>
                {fu.proofUrl && (
                  <div className="mt-2">
                    <a href={fu.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 px-3 rounded-md font-medium transition-colors">
                      <Paperclip className="w-3.5 h-3.5" /> View Proof
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showFollowUpForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Record Follow-Up</h3>
          <form onSubmit={handleAddFollowUp} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Method</label>
              <select 
                value={followUpType}
                onChange={e => setFollowUpType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="email">Email</option>
                <option value="call">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Outcomes</label>
              <textarea 
                value={followUpNotes}
                onChange={e => setFollowUpNotes(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Details of the conversation or email..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proof Upload (Screenshot / Log)</label>
              <input 
                type="file" 
                onChange={e => setProofFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
              />
              <p className="text-xs text-gray-400 mt-1">Upload an image or document logging the communication limit ~800kb).</p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowFollowUpForm(false)}
                className="px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : 'Save & Reset Deadline (+48h)'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
