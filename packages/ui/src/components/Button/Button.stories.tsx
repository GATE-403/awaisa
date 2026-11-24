import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'
import { ButtonLink } from './ButtonLink'

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'link', 'contrast'] as const

const SIZES = ['sm', 'md', 'lg'] as const

const meta = {
  title: 'Controls/Button',
  component: Button,
  args: { children: 'Book', variant: 'primary', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    size: { control: 'inline-radio', options: SIZES },
  },
} satisfies Meta<typeof Button>

type Story = StoryObj<typeof meta>

const Playground: Story = {}

const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}

const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {SIZES.map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
}

const Disabled: Story = { args: { disabled: true } }

const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <Button {...args} />
    </div>
  ),
}

// Navigation styled as a button keeps link semantics.
const AsLink: Story = {
  render: ({ variant, size }) => (
    <ButtonLink href='#book' variant={variant} size={size}>
      Open the booking
    </ButtonLink>
  ),
}

export default meta
export { AsLink, Disabled, FullWidth, Playground, Sizes, Variants }
