import type {Metadata} from 'next';
import './globals.css';
import ClientWrapper from './ClientWrapper';

export const metadata: Metadata = {
  title: 'RFI Escalation Tracker',
  description: 'Internal RFI Email Follow-Up Tracking System',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
