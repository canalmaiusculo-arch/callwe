import { AgencySidebar } from '@/components/agency/sidebar';
import { AdminImpersonationBanner } from '@/components/admin-impersonation-banner';
import { ChatWidget } from '@/components/chat-widget';
import { NotificationCenter } from '@/components/notification-center';

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AgencySidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <AdminImpersonationBanner />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
      <ChatWidget />
      <NotificationCenter />
    </div>
  );
}
