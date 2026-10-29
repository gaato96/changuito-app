import { BottomNav } from '@/components/nav';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-nav">{children}</main>
      <BottomNav />
    </>
  );
}
