import { flowById } from '../flows'
import { expect, test } from '../lib/fixture'
import { personas } from '../personas'

// Persona × flow: each project runs its persona's flows with its device's conditions. Serious
// and critical findings fail the test (softly, after the flow is done); the report lists all.
for (const persona of personas)
  for (const flowId of persona.flows) {
    const flow = flowById(flowId)
    // The tag picks the projects: each persona's devices grep for `@<persona id>`.
    test(`${flow.title} — ${persona.name} @${persona.id} @a11y`, async ({ ux }) => {
      ux.begin(flow.id, flow.title)
      await flow.run(ux)
      expect.soft(ux.blocking(), `${flow.goal}: серьёзные проблемы`).toEqual([])
    })
  }
