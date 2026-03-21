'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { sidebarLinks } from '@/constants';

const MobileNav = ({ user }: MobileNavProps) => {
  const pathname = usePathname();

  return (
    <nav className="mobile-tab-bar">
      <div className="flex items-center justify-around overflow-x-auto">
        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.route}
              href={item.route}
              className="flex flex-col items-center gap-1 py-1.5 px-3 min-w-[56px]"
            >
              <Icon
                size={20}
                className={cn('transition-all duration-200', {
                  'text-violet-400 scale-110': isActive,
                  'text-slate-500 opacity-60': !isActive,
                })}
              />
              <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-white' : 'text-slate-500')}>
                {item.label.split(' ')[0]}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
