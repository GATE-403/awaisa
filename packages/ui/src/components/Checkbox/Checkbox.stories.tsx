import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Controls/Checkbox',
  component: Checkbox,
  args: { defaultChecked: true },
  render: (args) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Checkbox {...args} />
      Remember me
    </label>
  ),
} satisfies Meta<typeof Checkbox>

type Story = StoryObj<typeof meta>

const Checked: Story = {}

const Unchecked: Story = { args: { defaultChecked: false } }

const Indeterminate: Story = { args: { defaultChecked: false, indeterminate: true } }

const Disabled: Story = { args: { disabled: true } }

export default meta
export { Checked, Disabled, Indeterminate, Unchecked }
