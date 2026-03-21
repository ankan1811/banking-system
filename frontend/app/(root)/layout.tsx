import AIChatbot from "@/components/AIChatbot";
import LandingPreview from "@/components/LandingPreview";
import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { serverApiRequest } from "@/lib/api/server-client";
import { cookies } from "next/headers";
import Image from "next/image";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let loggedIn: any = null;
  const raw = cookies().get('user-info')?.value;
  if (raw) {
    try { loggedIn = JSON.parse(raw); } catch {}
  }
  if (!loggedIn) {
    loggedIn = await serverApiRequest('/api/auth/me').catch(() => null);
  }

  if (!loggedIn) return <LandingPreview />;

  return (
    <main className="flex h-screen w-full bg-[#0a0e1a]">
      <Sidebar user={loggedIn} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="root-layout">
          <div className="flex items-center gap-2">
            <Image src="/icons/logo.svg" width={28} height={28} alt="logo" />
            <span className="text-lg font-bold font-ibm-plex-serif text-white">Ankan's Bank</span>
          </div>
          <div>
            <MobileNav user={loggedIn} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 custom-scrollbar">
          {children}
        </div>
      </div>
      <AIChatbot />
    </main>
  );
}
