import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from './Dialog'

const meta = {
  title: 'Overlays/Dialog',
  component: DialogContent,
  args: { variant: 'modal' },
  argTypes: { variant: { control: 'inline-radio', options: ['modal', 'panel', 'sheet'] } },
  render: (args) => (
    <Dialog>
      <DialogTrigger render={<Button variant='outline' />}>Open</DialogTrigger>
      <DialogContent {...args}>
        <DialogTitle>Delete the photo?</DialogTitle>
        <DialogDescription>Clients will no longer see it on your page.</DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
          <DialogClose render={<Button variant='danger' />}>Delete</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof DialogContent>

type Story = StoryObj<typeof meta>

const Modal: Story = {}

const Panel: Story = { args: { variant: 'panel' } }

// Centred on desktop, slides up from the bottom on phones.
const Sheet: Story = { args: { variant: 'sheet' } }

export default meta
export { Modal, Panel, Sheet }
