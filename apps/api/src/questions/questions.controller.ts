import type { BusinessQuestion, QuestionList } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import { validateEnv } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { type AnswerInput, type AskInput, answerSchema, askSchema } from './questions.schemas.js'
import { QuestionsService } from './questions.service.js'

const getRateLimit = () => validateEnv(process.env).BOOKING_RATE_LIMIT_PER_MINUTE

@Controller()
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('businesses/:slug/questions')
  listPublic(@Param('slug') slug: string): Promise<QuestionList> {
    return this.questions.listPublic(slug)
  }

  @Post('businesses/:slug/questions')
  @Throttle({ default: { limit: getRateLimit, ttl: 60_000 } })
  @UseGuards(AuthGuard)
  ask(
    @Param('slug') slug: string,
    @CurrentCustomer() customer: Customer,
    @Body({ schema: askSchema }) body: AskInput,
  ): Promise<BusinessQuestion> {
    return this.questions.ask(slug, customer, body.text)
  }

  // Staff answer too: «Как добраться?» is part of the day, not of the business setup.
  @Get('manage/:slug/questions')
  @UseGuards(BusinessAccessGuard)
  listForManage(@CurrentBusiness() business: Business): Promise<BusinessQuestion[]> {
    return this.questions.listForManage(business)
  }

  @Put('manage/:slug/questions/:id/answer')
  @UseGuards(BusinessAccessGuard)
  answer(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: answerSchema }) body: AnswerInput,
  ): Promise<BusinessQuestion> {
    return this.questions.answer(business, id, body.text)
  }

  @Delete('manage/:slug/questions/:id')
  @HttpCode(204)
  @UseGuards(BusinessAccessGuard)
  remove(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.questions.remove(business, id)
  }
}
