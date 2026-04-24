'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address'),
  dateReceived: z.string().min(1, 'Date received is required'),
  subject: z.string().min(1, 'Subject is required'),
  severity: z.enum(['High', 'Normal'])
});

type FormData = z.infer<typeof formSchema>;

export default function NewRfiPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      severity: 'Normal',
      dateReceived: new Date().toISOString().substring(0, 16) // Default to local current time YYYY-MM-DDThh:mm
    }
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const msInHour = 60 * 60 * 1000;
      const dateReceivedMs = new Date(data.dateReceived).getTime();
      const deadlineOffset = data.severity === 'High' ? 48 * msInHour : 7 * 24 * msInHour;
      
      const newRef = doc(collection(db, 'rfis'));
      const now = new Date().getTime();
      await setDoc(newRef, {
        subject: data.subject,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        dateReceived: dateReceivedMs,
        severity: data.severity,
        status: 'Waiting',
        deadline: dateReceivedMs + deadlineOffset,
        createdAt: now,
        updatedAt: now
      });
      router.push(`/rfi/${newRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving RFI manually');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Log New RFI Case</h1>
          <p className="text-sm text-gray-500 mt-1">Manually enter a case if not picked up by the IMAP sync.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input 
                {...register('customerName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.customerName && <p className="text-red-500 text-xs">{errors.customerName.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Customer Email</label>
              <input 
                type="email"
                {...register('customerEmail')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.customerEmail && <p className="text-red-500 text-xs">{errors.customerEmail.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date Received</label>
              <input 
                type="datetime-local"
                {...register('dateReceived')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.dateReceived && <p className="text-red-500 text-xs">{errors.dateReceived.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Severity</label>
              <select 
                {...register('severity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="Normal">Normal (7 Days)</option>
                <option value="High">High (48 Hours)</option>
              </select>
              {errors.severity && <p className="text-red-500 text-xs">{errors.severity.message}</p>}
            </div>
            
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">RFI Subject/Description</label>
              <input 
                {...register('subject')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.subject && <p className="text-red-500 text-xs">{errors.subject.message}</p>}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (
                <>
                  <Send className="w-4 h-4" /> Save RFI
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
