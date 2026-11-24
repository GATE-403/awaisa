import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './Select'

const CITIES = [
  { value: 'bishkek', label: 'Bishkek' },
  { value: 'osh', label: 'Osh' },
  { value: 'karakol', label: 'Karakol' },
  { value: 'naryn', label: 'Naryn', disabled: true },
]

const MANY = Array.from({ length: 24 }, (_, index) => ({
  value: String(index),
  label: `${String(9 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
}))

const meta = {
  title: 'Controls/Select',
  component: Select<string>,
  args: { items: CITIES, placeholder: 'Choose a city', 'aria-label': 'City' },
  argTypes: { variant: { control: 'inline-radio', options: ['default', 'plain'] } },
} satisfies Meta<typeof Select<string>>

type Story = StoryObj<typeof meta>

const Default: Story = {}

const Chosen: Story = { args: { defaultValue: 'osh' } }

// Borderless, right-aligned value for Settings-style rows.
const Plain: Story = { args: { variant: 'plain', defaultValue: 'bishkek' } }

// The list scrolls inside itself and fades at the edge with more to see.
const LongList: Story = { args: { items: MANY, placeholder: 'Time', 'aria-label': 'Time' } }

export default meta
export { Chosen, Default, LongList, Plain }
