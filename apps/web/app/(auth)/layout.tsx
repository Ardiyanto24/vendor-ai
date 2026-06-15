import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'Dashboard | AI Vendor Selection',
};

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
