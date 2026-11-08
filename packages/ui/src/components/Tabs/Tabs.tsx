import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { mergeClassName } from '../../utils/className'
import styles from './Tabs.module.css'

interface TabsProps extends BaseTabs.Root.Props {}

interface TabsListProps extends BaseTabs.List.Props {}

interface TabsTabProps extends BaseTabs.Tab.Props {}

interface TabsPanelProps extends BaseTabs.Panel.Props {}

const Tabs = ({ className, ...props }: TabsProps) => (
  <BaseTabs.Root className={mergeClassName(styles.root, className)} {...props} />
)

const TabsList = ({ className, children, ...props }: TabsListProps) => (
  <BaseTabs.List className={mergeClassName(styles.list, className)} {...props}>
    {children}
    <BaseTabs.Indicator className={styles.indicator} />
  </BaseTabs.List>
)

const TabsTab = ({ className, ...props }: TabsTabProps) => (
  <BaseTabs.Tab className={mergeClassName(styles.tab, className)} {...props} />
)

const TabsPanel = ({ className, ...props }: TabsPanelProps) => (
  <BaseTabs.Panel className={mergeClassName(styles.panel, className)} {...props} />
)

export type { TabsListProps, TabsPanelProps, TabsProps, TabsTabProps }
export { Tabs, TabsList, TabsPanel, TabsTab }
