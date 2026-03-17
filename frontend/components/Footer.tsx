'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { logoutAccount } from '@/lib/api/auth.api'

const Footer = ({ user, type = 'desktop' }: FooterProps) => {
  const router = useRouter();

  const handleLogOut = async () => {
    await logoutAccount();
    router.push('/sign-in');
  }

  return (
    <footer className="footer">
      <div className="flex items-center gap-3 min-w-0">
        <div className={type === 'mobile' ? 'footer_name-mobile' : 'footer_name'}>
          <p className="text-sm font-bold text-white">{user?.firstName[0]}</p>
        </div>
        <div className={type === 'mobile' ? 'footer_email-mobile' : 'footer_email'}>
          <h1 className="text-sm font-medium text-white truncate">{user?.firstName}</h1>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
      </div>
      <div className="footer_image" onClick={handleLogOut}>
        <Image src="/icons/logout.svg" width={18} height={18} alt="logout" />
      </div>
    </footer>
  )
}

export default Footer
