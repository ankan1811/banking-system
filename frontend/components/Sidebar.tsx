'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import PlaidLink from './PlaidLink'
import { sidebarLinks } from '@/constants'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="group sidebar">
      <nav className="flex flex-col h-full">
        <Link href="/" className="flex items-center gap-3 px-5 py-5 mb-2">
          <Image src="/icons/logo.svg" width={28} height={28} alt="Horizon" className="shrink-0" />
          <h1 className="sidebar-label text-xl font-bold font-ibm-plex-serif text-white">Horizon</h1>
        </Link>

        <div className="flex flex-col gap-1 px-3 flex-1">
          {sidebarLinks.map((item) => {
            const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
            return (
              <Link
                href={item.route}
                key={item.label}
                className={cn('sidebar-link', {
                  'bg-gradient-to-r from-violet-600/20 to-indigo-600/15 border-violet-500/20 text-white': isActive,
                  'text-slate-400 hover:text-white hover:bg-white/[0.04]': !isActive,
                })}
              >
                <div className="relative size-6 shrink-0">
                  <Image
                    src={item.imgURL}
                    fill
                    alt={item.label}
                    className={cn('transition-all', {
                      'brightness-[3] invert-0': isActive,
                      'opacity-60': !isActive,
                    })}
                  />
                </div>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="px-3 mb-2">
          <PlaidLink user={user} variant="ghost" />
        </div>

        <Footer user={user} />
      </nav>
    </section>
  );
};

export default Sidebar;
