import { AgencySidebar } from '@/components/agency/sidebar';

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AgencySidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
