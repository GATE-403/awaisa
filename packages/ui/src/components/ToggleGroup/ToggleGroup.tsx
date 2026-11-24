import { Toggle as BaseToggle } from '@base-ui/react/toggle'
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group'
import { mergeClassName } from '../../utils/className'

type ToggleSize = 'sm' | 'md' | 'card'

interface ToggleGroupProps<Value extends string> extends BaseToggleGroup.Props<Value> {
  layout?: 'wrap' | 'scroll' | 'grid'
}

interface ToggleProps<Value extends string> extends BaseToggle.Props<Value> {
  size?: ToggleSize
}

const ToggleGroup = <Value extends string>({
  layout = 'wrap',
  className,
  ...props
}: ToggleGroupProps<Value>) => (
  <BaseToggleGroup
    data-slot='toggle-group'
    data-layout={layout}
    className={mergeClassName(
      'flex gap-2 data-[layout=grid]:grid data-[layout=grid]:grid-cols-[repeat(auto-fill,minmax(76px,1fr))] data-[layout=scroll]:no-scrollbar data-[layout=scroll]:snap-x data-[layout=scroll]:overflow-x-auto data-[layout=scroll]:overscroll-x-contain data-[layout=wrap]:flex-wrap data-[layout=scroll]:*:snap-start',
      className,
    )}
    {...props}
  />
)

// shadcn's outline toggle; `card` is a day card (weekday over the date).
const Toggle = <Value extends string>({ size = 'md', className, ...props }: ToggleProps<Value>) => (
  <BaseToggle
    data-slot='toggle'
    data-size={size}
    className={mergeClassName(
      "relative inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-input bg-transparent text-sm font-medium whitespace-nowrap tabular-nums transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-disabled:pointer-events-none data-disabled:opacity-50 data-disabled:line-through data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-[size=card]:w-[60px] data-[size=card]:flex-col data-[size=card]:gap-0 data-[size=card]:py-2 data-[size=md]:h-8 data-[size=md]:min-w-8 data-[size=md]:px-2.5 data-[size=sm]:h-7 data-[size=sm]:min-w-7 data-[size=sm]:px-2.5 data-[size=sm]:text-[0.8rem] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
)

export type { ToggleGroupProps, ToggleProps, ToggleSize }
export { Toggle, ToggleGroup }
