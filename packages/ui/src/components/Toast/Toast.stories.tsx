import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../Button'
import { ToastProvider, type ToastType, useToast } from './Toast'

interface DemoProps {
  type: ToastType
  title: string
  description?: string
  hasAction?: boolean
  isOpenable?: boolean
}

const Demo = ({ type, title, description, hasAction, isOpenable }: DemoProps) => {
  const toast = useToast()

  const show = () =>
    toast.show({
      type,
      title,
      description,
      action: hasAction ? { label: 'Undo', onClick: () => {} } : undefined,
      onOpen: isOpenable ? () => {} : undefined,
    })

  return (
    <Button variant='outline' onClick={show}>
      Show toast
    </Button>
  )
}

const meta = {
  title: 'Feedback/Toast',
  component: Demo,
  args: { type: 'success', title: 'Booked', description: 'Saturday, 14 November at 15:30' },
  argTypes: { type: { control: 'inline-radio', options: ['success', 'error', 'info'] } },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof Demo>

type Story = StoryObj<typeof meta>

const Success: Story = {}

const ErrorToast: Story = {
  name: 'Error',
  args: { type: 'error', title: 'Could not book', description: 'This time was just taken' },
}

const WithUndo: Story = {
  args: { type: 'info', title: 'Booking cancelled', description: undefined, hasAction: true },
}

// A tap on the toast opens what it is about, like a notification.
const Openable: Story = {
  args: {
    type: 'info',
    title: 'New booking',
    description: 'Thu 14:30 · Haircut',
    isOpenable: true,
  },
}

export default meta
export { ErrorToast, Openable, Success, WithUndo }
