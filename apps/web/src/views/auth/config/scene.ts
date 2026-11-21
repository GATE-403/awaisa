import type { LoginStep } from '../model/useLoginForm'

// How far each sign-in step turns the prism behind it (the shader's `k`): the light moves with the
// person from the number to the code to the name.
const STEP_TURN: Record<LoginStep, number> = { phone: 0, code: 1, name: 2 }

export { STEP_TURN }
