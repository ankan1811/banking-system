import Image from 'next/image'
import { topCategoryStyles } from '@/constants'
import { cn } from '@/lib/utils'
import { Progress } from './ui/progress'

const Category = ({ category }: CategoryProps) => {
  const {
    bg,
    circleBg,
    text: { main, count },
    progress: { bg: progressBg, indicator },
    icon,
  } = topCategoryStyles[category.name as keyof typeof topCategoryStyles] ||
  topCategoryStyles.default;

  return (
    <div className={cn('category-pill', bg)}>
      <figure className={cn('flex-center size-8 rounded-full shrink-0', circleBg)}>
        <Image src={icon} width={16} height={16} alt={category.name} />
      </figure>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-sm font-medium truncate', main)}>{category.name}</p>
          <p className={cn('text-sm font-normal shrink-0', count)}>{category.count}</p>
        </div>
        <Progress
          value={(category.count / category.totalCount) * 100}
          className={cn('h-1.5 w-full mt-1.5', progressBg)}
          indicatorClassName={cn('h-1.5 w-full', indicator)}
        />
      </div>
    </div>
  )
}

export default Category
