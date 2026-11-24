import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './Avatar'

const SIZES = ['sm', 'md', 'lg', 'xl'] as const

const meta = {
  title: 'Content/Avatar',
  component: Avatar,
  args: { name: 'Aigerim Sadykova', size: 'lg' },
  argTypes: { size: { control: 'inline-radio', options: SIZES } },
} satisfies Meta<typeof Avatar>

type Story = StoryObj<typeof meta>

const Initials: Story = {}

const Photo: Story = {
  args: { src: 'https://randomuser.me/api/portraits/women/44.jpg' },
}

const Fallback: Story = { args: { fallback: '🙂' } }

const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {SIZES.map((size) => (
        <Avatar key={size} {...args} size={size} />
      ))}
    </div>
  ),
}

export default meta
export { Fallback, Initials, Photo, Sizes }
