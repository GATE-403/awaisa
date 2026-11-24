import type { Meta, StoryObj } from '@storybook/react-vite'
import { MenuItem, MenuSeparator } from '../Menu'
import { ContextMenu } from './ContextMenu'

const meta = {
  title: 'Overlays/ContextMenu',
  component: ContextMenu,
  args: {
    children: null,
    menu: (
      <>
        <MenuItem>Open booking</MenuItem>
        <MenuItem>Call</MenuItem>
        <MenuSeparator />
        <MenuItem variant='danger'>Cancel booking</MenuItem>
      </>
    ),
  },
  render: (args) => (
    <ContextMenu {...args}>
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          height: 160,
          maxWidth: 360,
          borderRadius: 12,
          background: 'var(--color-surface)',
          color: 'var(--color-muted-foreground)',
        }}
      >
        Right-click here
      </div>
    </ContextMenu>
  ),
} satisfies Meta<typeof ContextMenu>

type Story = StoryObj<typeof meta>

const Default: Story = {}

const Disabled: Story = { args: { disabled: true } }

export default meta
export { Default, Disabled }
