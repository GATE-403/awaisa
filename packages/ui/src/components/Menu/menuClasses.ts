// shadcn's dropdown-menu parts, shared with the context menu. Menus sit above the app's sheets
// (90; the booking screen is 60).
const MENU_POSITIONER = 'isolate z-[90] outline-none'

const MENU_POPUP =
  'max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95'

const MENU_ITEM =
  "group/menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[variant=danger]:text-destructive data-[variant=danger]:data-highlighted:bg-destructive/10 data-[variant=danger]:data-highlighted:text-destructive dark:data-[variant=danger]:data-highlighted:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 data-popup-open:bg-accent data-popup-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

const MENU_SEPARATOR = '-mx-1 my-1 h-px bg-border'

const MENU_LABEL = 'px-1.5 py-1 text-xs font-medium text-muted-foreground'

export { MENU_ITEM, MENU_LABEL, MENU_POPUP, MENU_POSITIONER, MENU_SEPARATOR }
