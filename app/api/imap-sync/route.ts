import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const configsSnapshot = await adminDb.collection('imap_configs').get();
    const configs: any[] = configsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Also include env variables if present as a "primary" account if not already redundant
    const envHost = process.env.IMAP_HOST;
    const envUser = process.env.IMAP_USER;
    const envPass = process.env.IMAP_PASS;
    const envPort = parseInt(process.env.IMAP_PORT || '993', 10);

    if (envHost && envUser && envPass) {
      configs.push({
        id: 'env-default',
        host: envHost,
        port: envPort,
        user: envUser,
        pass: envPass,
        label: 'Environment Default'
      });
    }

    if (configs.length === 0) {
      return NextResponse.json({ error: 'No IMAP configurations found' }, { status: 400 });
    }

    let totalCount = 0;
    const allMessages = [];

    for (const config of configs as any[]) {
      const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.port === 993,
        auth: { user: config.user, pass: config.pass },
        logger: false 
      });

      try {
        await client.connect();
        let lock = await client.getMailboxLock('INBOX');
        try {
          for await (let msg of client.fetch({ seen: false }, { source: true, envelope: true })) {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source);
            
            const fromAddr = parsed.from?.value[0]?.address || 'unknown@example.com';
            const fromName = parsed.from?.value[0]?.name || fromAddr;
            const subject = parsed.subject || 'No Subject';
            const dateReceived = parsed.date ? parsed.date.getTime() : Date.now();
            
            const isUrgent = subject.toLowerCase().includes('urgent');
            const severity = isUrgent ? 'High' : 'Normal';
            
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
              updatedAt: Date.now(),
              syncedFrom: config.label || config.user
            };

            const rfiRef = adminDb.collection('rfis').doc();
            await rfiRef.set(rfiData);

            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
            allMessages.push({ id: rfiRef.id, subject });
            totalCount++;
          }
        } finally {
          lock.release();
        }
      } catch (err) {
        console.error(`IMAP Error for ${config.label}:`, err);
        // Continue to next mailbox even if one fails
      } finally {
        await client.logout();
      }
    }

    return NextResponse.json({ success: true, count: totalCount, messages: allMessages });

  } catch (error) {
    console.error('System Error:', error);
    return NextResponse.json({ error: 'Failed to process IMAP sync' }, { status: 500 });
  }
}
