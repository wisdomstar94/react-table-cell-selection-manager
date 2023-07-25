import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test 1',
  description: 'Test 1',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>{children}</>
  );
}
