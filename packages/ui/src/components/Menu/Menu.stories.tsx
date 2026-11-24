import type { Meta, StoryObj } from '@storybook/react-vite'
import { Menu, MenuGroup, MenuItem, MenuSeparator, MenuSubmenu } from './Menu'
import styles from './Menu.stories.module.css'

const meta = {
  title: 'Overlays/Menu',
  component: Menu,
  args: {
    label: 'Booking actions',
    align: 'start',
    trigger: 'More',
    children: null,
  },
  argTypes: { align: { control: 'inline-radio', options: ['start', 'center', 'end'] } },
  render: (args) => (
    <Menu {...args} className={styles.trigger} trigger='More'>
      <MenuItem>Add to calendar</MenuItem>
      <MenuItem>Route</MenuItem>
      <MenuSeparator />
      <MenuItem variant='danger'>Cancel booking</MenuItem>
    </Menu>
  ),
} satisfies Meta<typeof Menu>

type Story = StoryObj<typeof meta>

const Default: Story = {}

const WithGroup: Story = {
  render: (args) => (
    <Menu {...args} className={styles.trigger} trigger='Report'>
      <MenuGroup label='Report'>
        <MenuItem>Spam</MenuItem>
        <MenuItem>Offensive</MenuItem>
        <MenuItem>Fake</MenuItem>
      </MenuGroup>
    </Menu>
  ),
}

const WithSubmenu: Story = {
  render: (args) => (
    <Menu {...args} className={styles.trigger} trigger='More'>
      <MenuItem>Share</MenuItem>
      <MenuSubmenu label='Report'>
        <MenuItem>Spam</MenuItem>
        <MenuItem>Offensive</MenuItem>
      </MenuSubmenu>
    </Menu>
  ),
}

export default meta
export { Default, WithGroup, WithSubmenu }
