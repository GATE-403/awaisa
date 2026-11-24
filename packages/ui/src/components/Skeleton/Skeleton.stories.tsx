import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './Skeleton'

const meta = {
  title: 'Content/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>

type Story = StoryObj<typeof meta>

const Line: Story = { args: { style: { width: 240, height: 16 } } }

const Card: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, width: 180 }}>
      <Skeleton style={{ aspectRatio: '3 / 4', borderRadius: 12 }} />
      <Skeleton style={{ height: 14, width: '80%' }} />
      <Skeleton style={{ height: 14, width: '50%' }} />
    </div>
  ),
}

export default meta
export { Card, Line }
