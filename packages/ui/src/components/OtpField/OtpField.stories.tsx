import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { OtpField } from './OtpField'

const meta = {
  title: 'Controls/OtpField',
  component: OtpField,
  args: { value: '', onValueChange: () => {}, length: 6, 'aria-label': 'Code from Telegram' },
  render: function Render(args) {
    const [value, setValue] = useState(args.value)

    return <OtpField {...args} value={value} onValueChange={setValue} />
  },
} satisfies Meta<typeof OtpField>

type Story = StoryObj<typeof meta>

const Empty: Story = {}

const Partly: Story = { args: { value: '123' } }

// A wrong code: red cells with a shake.
const Invalid: Story = { args: { value: '123456', isInvalid: true } }

const Disabled: Story = { args: { value: '1234', disabled: true } }

export default meta
export { Disabled, Empty, Invalid, Partly }
