import type { Meta, StoryObj } from '@storybook/react-vite'
import { RadioGroup } from '../Radio'
import { RadioCard } from './RadioCard'

const meta = {
  title: 'Controls/RadioCard',
  component: RadioCard,
  args: { value: 'basic', title: 'Basic', description: 'To get to know it', size: 'md' },
  argTypes: { size: { control: 'inline-radio', options: ['md', 'lg'] } },
  render: (args) => (
    <RadioGroup
      defaultValue='pro'
      aria-label='Plan'
      style={{ display: 'grid', gap: 12, maxWidth: 420 }}
    >
      <RadioCard {...args} />
      <RadioCard value='pro' title='Pro' description='Everything, no limits' size={args.size} />
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioCard>

type Story = StoryObj<typeof meta>

const Default: Story = {}

const Large: Story = { args: { size: 'lg' } }

const WithTrailing: Story = { args: { trailing: '990 som' } }

export default meta
export { Default, Large, WithTrailing }
