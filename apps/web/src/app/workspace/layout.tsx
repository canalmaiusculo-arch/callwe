import { WorkspaceSidebar } from '@/components/workspace/sidebar';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <WorkspaceSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
