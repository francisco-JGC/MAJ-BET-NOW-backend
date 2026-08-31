import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { Roles } from '../../../../auth/infrastructure/http/decorators/roles.decorator';
import { UserRole } from '../../../../users/domain/value-objects/user-role';
import type { DrawScheduleOutput } from '../../../application/dtos/draw-schedule.output';
import { CreateDrawSchedule } from '../../../application/use-cases/create-draw-schedule.use-case';
import { DeleteDrawSchedule } from '../../../application/use-cases/delete-draw-schedule.use-case';
import { ListDrawSchedules } from '../../../application/use-cases/list-draw-schedules.use-case';
import { UpdateDrawSchedule } from '../../../application/use-cases/update-draw-schedule.use-case';
import { CreateDrawScheduleHttpDto } from '../dtos/create-draw-schedule-http.dto';
import { UpdateDrawScheduleHttpDto } from '../dtos/update-draw-schedule-http.dto';

@Controller()
export class DrawSchedulesController {
  constructor(
    private readonly listDrawSchedules: ListDrawSchedules,
    private readonly createDrawSchedule: CreateDrawSchedule,
    private readonly updateDrawSchedule: UpdateDrawSchedule,
    private readonly deleteDrawSchedule: DeleteDrawSchedule,
  ) {}

  @Get('games/:gameId/schedules')
  list(
    @Param('gameId', new ParseUUIDPipe()) gameId: string,
  ): Promise<DrawScheduleOutput[]> {
    return this.listDrawSchedules.execute(gameId);
  }

  @Post('games/:gameId/schedules')
  @Roles(UserRole.ADMIN)
  create(
    @Param('gameId', new ParseUUIDPipe()) gameId: string,
    @Body() dto: CreateDrawScheduleHttpDto,
  ): Promise<DrawScheduleOutput> {
    return this.createDrawSchedule.execute({
      gameId,
      dayOfWeek: dto.dayOfWeek,
      drawTime: dto.drawTime,
      cutoffMinutes: dto.cutoffMinutes,
    });
  }

  @Patch('schedules/:id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDrawScheduleHttpDto,
  ): Promise<DrawScheduleOutput> {
    return this.updateDrawSchedule.execute({
      id,
      dayOfWeek: dto.dayOfWeek,
      drawTime: dto.drawTime,
      cutoffMinutes: dto.cutoffMinutes,
      isActive: dto.isActive,
    });
  }

  @Delete('schedules/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.deleteDrawSchedule.execute(id);
  }
}
