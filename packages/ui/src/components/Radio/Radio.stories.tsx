import type { Meta, StoryObj } from '@storybook/react-vite'
import { Radio, RadioGroup } from './Radio'

const OPTIONS = [
  { value: 'card', label: 'By card' },
  { value: 'cash', label: 'In cash' },
  { value: 'transfer', label: 'By transfer' },
]

const meta = {
  title: 'Controls/Radio',
  component: RadioGroup,
  args: { defaultValue: 'card', 'aria-label': 'Payment method', variant: 'stack' },
  argTypes: { variant: { control: 'inline-radio', options: ['stack', 'inset'] } },
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <RadioGroup {...args}>
        {OPTIONS.map((option) => (
          <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio value={option.value} />
            {option.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  ),
} satisfies Meta<typeof RadioGroup>

type Story = StoryObj<typeof meta>

const Stack: Story = {}

// Settings-style inset group.
const Inset: Story = { args: { variant: 'inset' } }

const Disabled: Story = { args: { disabled: true } }

export default meta
export { Disabled, Inset, Stack }
