import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  const host = process.env.IMAP_HOST;
  const port = parseInt(process.env.IMAP_PORT || '993', 10);
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!host || !user || !pass) {
    return NextResponse.json({ error: 'IMAP configuration missing' }, { status: 500 });
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false 
  });

  try {
    await client.connect();
    // Select INBOX
    let lock = await client.getMailboxLock('INBOX');
    try {
      // Find all unseen messages
      const messages = [];
      for await (let msg of client.fetch({ seen: false }, { source: true, envelope: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        
        // Build RFI Data
        const fromAddr = parsed.from?.value[0]?.address || 'unknown@example.com';
        const fromName = parsed.from?.value[0]?.name || fromAddr;
        const subject = parsed.subject || 'No Subject';
        const dateReceived = parsed.date ? parsed.date.getTime() : Date.now();
        
        // Define default severity and deadlines
        // E.g., if subject contains "urgent", severity = High; else Normal
        const isUrgent = subject.toLowerCase().includes('urgent');
        const severity = isUrgent ? 'High' : 'Normal';
        
        // High = 48 hours, Normal = 7 days
        const msInHour = 60 * 60 * 1000;
        const deadlineOffset = isUrgent ? 48 * msInHour : 7 * 24 * msInHour;
        
        const rfiData = {
          subject,
          customerName: fromName,
          customerEmail: fromAddr,
          dateReceived,
          severity,
          status: 'Waiting',
          deadline: dateReceived + deadlineOffset,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        // Create document in Firestore
        const rfiRef = adminDb.collection('rfis').doc();
        await rfiRef.set(rfiData);

        // Mark as seen
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
        messages.push({ id: rfiRef.id, subject });
      }
      return NextResponse.json({ success: true, count: messages.length, messages });
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error('IMAP Error:', error);
    return NextResponse.json({ error: 'Failed to sync with IMAP server' }, { status: 500 });
  } finally {
    await client.logout();
  }
}
