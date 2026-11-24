import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '../Input'
import { Field } from './Field'

const meta = {
  title: 'Controls/Field',
  component: Field,
  args: { label: 'Phone', description: 'We text the confirmation here' },
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <Field {...args}>
        <Input type='tel' inputMode='tel' placeholder='555 123 456' defaultValue='555 12' />
      </Field>
    </div>
  ),
} satisfies Meta<typeof Field>

type Story = StoryObj<typeof meta>

const WithDescription: Story = {}

const WithError: Story = { args: { description: undefined, error: 'Enter all nine digits' } }

export default meta
export { WithDescription, WithError }
