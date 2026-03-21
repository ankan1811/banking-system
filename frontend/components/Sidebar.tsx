'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import { sidebarLinks } from '@/constants'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="group sidebar">
      <nav className="flex flex-col h-full">
        <Link href="/" className="flex items-center gap-3 px-5 py-5 mb-2 shrink-0">
          <Image src="/icons/logo.svg" width={28} height={28} alt="Ankan's Bank" className="shrink-0" />
          <h1 className="sidebar-label text-xl font-bold font-ibm-plex-serif text-white">Ankan's Bank</h1>
        </Link>

        <div className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto custom-scrollbar">
          {sidebarLinks.map((item) => {
            const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
            const Icon = item.icon;
            return (
              <Link
                href={item.route}
                key={item.label}
                className={cn('sidebar-link', {
                  'bg-gradient-to-r from-violet-600/20 to-indigo-600/15 border-violet-500/20 text-white': isActive,
                  'text-slate-400 hover:text-white hover:bg-white/[0.04]': !isActive,
                })}
              >
                <Icon
                  size={20}
                  className={cn('shrink-0 transition-all', {
                    'text-violet-400': isActive,
                    'opacity-60': !isActive,
                  })}
                />
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

<div className="shrink-0">
          <Footer user={user} />
        </div>
      </nav>
    </section>
  );
};

export default Sidebar;
