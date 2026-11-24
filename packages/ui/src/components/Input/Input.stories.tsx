import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './Input'

const meta = {
  title: 'Controls/Input',
  component: Input,
  args: { placeholder: 'Your name', 'aria-label': 'Name', variant: 'default' },
  argTypes: { variant: { control: 'inline-radio', options: ['default', 'plain'] } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

type Story = StoryObj<typeof meta>

const Default: Story = {}

// Borderless, right-aligned value for Settings-style rows.
const Plain: Story = { args: { variant: 'plain', defaultValue: 'Aigerim' } }

const Disabled: Story = { args: { disabled: true, defaultValue: 'Aigerim' } }

export default meta
export { Default, Disabled, Plain }
