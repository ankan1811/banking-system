import ColdStartScreen from "@/components/ColdStartScreen";

const API_URL = process.env.API_URL || 'http://localhost:8787';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let backendCold = false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) backendCold = true;
  } catch {
    backendCold = true;
  }

  if (backendCold) return <ColdStartScreen />;

  return (
    <main className="auth-bg flex min-h-screen items-center justify-center p-4">
      {children}
    </main>
  );
}
