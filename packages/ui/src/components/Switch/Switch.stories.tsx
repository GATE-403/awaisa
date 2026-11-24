import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from './Switch'

const meta = {
  title: 'Controls/Switch',
  component: Switch,
  args: { defaultChecked: true },
  render: (args) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Switch {...args} />
      Notifications
    </label>
  ),
} satisfies Meta<typeof Switch>

type Story = StoryObj<typeof meta>

const On: Story = {}

const Off: Story = { args: { defaultChecked: false } }

const Disabled: Story = { args: { disabled: true } }

export default meta
export { Disabled, Off, On }
