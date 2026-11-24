import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from '../Button'
import { Popover } from './Popover'

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  args: {
    open: false,
    onOpenChange: () => {},
    anchor: null,
    label: 'Visit',
    side: 'right',
    children: null,
  },
  argTypes: { side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] } },
  render: function Render(args) {
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    return (
      <div style={{ padding: 80 }}>
        <Button ref={setAnchor} variant='secondary' onClick={() => setIsOpen(true)}>
          Timur A. · 10:00
        </Button>
        <Popover {...args} anchor={anchor} open={isOpen} onOpenChange={setIsOpen}>
          <div style={{ display: 'grid', gap: 4, padding: 16, width: 240 }}>
            <strong>Haircut · Meerim</strong>
            <span style={{ color: 'var(--color-muted-foreground)' }}>Thu, 19 Nov, 10:00–10:40</span>
          </div>
        </Popover>
      </div>
    )
  },
} satisfies Meta<typeof Popover>

type Story = StoryObj<typeof meta>

const Default: Story = {}

const Bottom: Story = { args: { side: 'bottom' } }

export default meta
export { Bottom, Default }
