# AGENTS.md

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

Nest has first-party packages for most needs (config, TypeORM, OpenAPI, throttling, health checks, queues, schedules). Check https://docs.nestjs.com before adding another library or writing your own.

Validation works with Zod, Valibot, ArkType or any other Standard Schema library: `StandardSchemaValidationPipe` with `@Body({ schema })` or `@Param('id', { schema })` (https://docs.nestjs.com/application/validation.md).

Nest's packages are ESM only, and this project is ESM too: relative imports end in `.js`, `__dirname` doesn't exist (use `import.meta.dirname`), and tests run on Vitest, so mocks are `vi.fn()`, not `jest.fn()`.

## Project conventions

- Env is validated in `src/config/env.ts`; read it through `ConfigService<Env, true>`.
- Files follow Nest naming (`*.module.ts`, `*.controller.ts`, `*.entity.ts`); code style follows the root Biome config.
