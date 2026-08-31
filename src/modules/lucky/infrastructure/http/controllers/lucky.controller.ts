import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';

import type { LuckyDailyOutput } from '../../../application/dtos/lucky-daily.output';
import { FindLuckyForDate } from '../../../application/use-cases/find-lucky-for-date.use-case';
import { ListLuckyHistory } from '../../../application/use-cases/list-lucky-history.use-case';
import { LuckyKind } from '../../../domain/value-objects/lucky-kind';
import {
  LuckyHistoryQueryDto,
  LuckyQueryDto,
} from '../dtos/lucky-query.dto';

@Controller('lucky')
export class LuckyController {
  constructor(
    private readonly findForDate: FindLuckyForDate,
    private readonly listHistory: ListLuckyHistory,
  ) {}

  @Get(':kind/history')
  history(
    @Param('kind') rawKind: string,
    @Query() query: LuckyHistoryQueryDto,
  ): Promise<LuckyDailyOutput[]> {
    const kind = this.parseKind(rawKind);
    return this.listHistory.execute(kind, query.limit ?? 30);
  }

  @Get(':kind')
  today(
    @Param('kind') rawKind: string,
    @Query() query: LuckyQueryDto,
  ): Promise<LuckyDailyOutput> {
    const kind = this.parseKind(rawKind);
    const date = query.date ? this.parseLocalDate(query.date) : new Date();
    return this.findForDate.execute(kind, date);
  }

  private parseLocalDate(raw: string): Date {
    // Accept "YYYY-MM-DD" and build a LOCAL Date so the day matches the
    // caller's intent regardless of the server's timezone.
    const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private parseKind(raw: string): LuckyKind {
    const values = Object.values(LuckyKind) as string[];
    if (values.includes(raw)) return raw as LuckyKind;
    throw new BadRequestException(
      `Invalid lucky kind "${raw}". Expected one of: ${values.join(', ')}.`,
    );
  }
}
