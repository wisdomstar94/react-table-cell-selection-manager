import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test',
  description: 'Test',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>{children}</>
  );
}
