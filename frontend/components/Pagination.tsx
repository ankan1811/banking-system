'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { formUrlQuery } from '@/lib/utils'

export const Pagination = ({ page, totalPages }: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNavigation = (type: string) => {
    const pageNumber = type === 'prev' ? Number(page) - 1 : Number(page) + 1;
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: 'page',
      value: pageNumber.toString(),
    });
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={() => handleNavigation('prev')}
        disabled={Number(page) <= 1}
        className="pagination-btn"
      >
        <Image src="/icons/arrow-left.svg" width={16} height={16} alt="prev" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-white">{page}</span>
        <span className="text-sm text-slate-500">/</span>
        <span className="text-sm text-slate-500">{totalPages}</span>
      </div>

      <button
        onClick={() => handleNavigation('next')}
        disabled={Number(page) >= totalPages}
        className="pagination-btn"
      >
        <span className="hidden sm:inline">Next</span>
        <Image src="/icons/arrow-left.svg" width={16} height={16} alt="next" className="-scale-x-100" />
      </button>
    </div>
  )
}
