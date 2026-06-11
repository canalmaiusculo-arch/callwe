import { WorkspaceSidebar } from '@/components/workspace/sidebar';
import { ChatWidget } from '@/components/chat-widget';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <WorkspaceSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
