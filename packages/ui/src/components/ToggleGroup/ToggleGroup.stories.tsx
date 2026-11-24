import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toggle, ToggleGroup } from './ToggleGroup'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const meta = {
  title: 'Controls/ToggleGroup',
  component: ToggleGroup<string>,
  args: { defaultValue: ['Mon'], layout: 'wrap', 'aria-label': 'Days' },
  argTypes: { layout: { control: 'inline-radio', options: ['wrap', 'scroll', 'grid'] } },
  render: (args) => (
    <div style={{ maxWidth: 420 }}>
      <ToggleGroup {...args}>
        {DAYS.map((day) => (
          <Toggle key={day} value={day}>
            {day}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  ),
} satisfies Meta<typeof ToggleGroup<string>>

type Story = StoryObj<typeof meta>

const Single: Story = {}

const Multiple: Story = { args: { multiple: true, defaultValue: ['Mon', 'Wed', 'Fri'] } }

const Scroll: Story = { args: { layout: 'scroll' } }

const Small: Story = {
  render: (args) => (
    <ToggleGroup {...args}>
      {DAYS.map((day) => (
        <Toggle key={day} value={day} size='sm'>
          {day}
        </Toggle>
      ))}
    </ToggleGroup>
  ),
}

export default meta
export { Multiple, Scroll, Single, Small }
