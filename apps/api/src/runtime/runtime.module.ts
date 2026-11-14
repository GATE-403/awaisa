import { type DynamicModule, Global, Module } from '@nestjs/common'
import type { ProcessRole } from './process-role.js'
import { PROCESS_ROLE, RuntimeService } from './runtime.service.js'

@Global()
@Module({})
export class RuntimeModule {
  static forRole(role: ProcessRole): DynamicModule {
    return {
      module: RuntimeModule,
      providers: [{ provide: PROCESS_ROLE, useValue: role }, RuntimeService],
      exports: [RuntimeService],
    }
  }
}
