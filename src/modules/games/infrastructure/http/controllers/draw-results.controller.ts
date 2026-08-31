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
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../../auth/infrastructure/http/decorators/current-user.decorator';
import { Roles } from '../../../../auth/infrastructure/http/decorators/roles.decorator';
import type { RequestUser } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { UserRole } from '../../../../users/domain/value-objects/user-role';
import type { DrawResultOutput } from '../../../application/dtos/draw-result.output';
import { CreateDrawResult } from '../../../application/use-cases/create-draw-result.use-case';
import { DeleteDrawResult } from '../../../application/use-cases/delete-draw-result.use-case';
import { ListDrawResults } from '../../../application/use-cases/list-draw-results.use-case';
import { UpdateDrawResult } from '../../../application/use-cases/update-draw-result.use-case';
import { CreateDrawResultHttpDto } from '../dtos/create-draw-result-http.dto';
import { ListDrawResultsQueryDto } from '../dtos/list-draw-results-query.dto';
import { UpdateDrawResultHttpDto } from '../dtos/update-draw-result-http.dto';

@Controller('draw-results')
export class DrawResultsController {
  constructor(
    private readonly createDrawResult: CreateDrawResult,
    private readonly listDrawResults: ListDrawResults,
    private readonly updateDrawResult: UpdateDrawResult,
    private readonly deleteDrawResult: DeleteDrawResult,
  ) {}

  @Get()
  list(@Query() query: ListDrawResultsQueryDto): Promise<DrawResultOutput[]> {
    return this.listDrawResults.execute({
      gameId: query.gameId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDrawResultHttpDto,
  ): Promise<DrawResultOutput> {
    return this.createDrawResult.execute({
      gameId: dto.gameId,
      drawAt: new Date(dto.drawAt),
      winningNumber: dto.winningNumber,
      recordedById: user.id,
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDrawResultHttpDto,
  ): Promise<DrawResultOutput> {
    return this.updateDrawResult.execute({
      id,
      winningNumber: dto.winningNumber,
      recordedById: user.id,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.deleteDrawResult.execute(id);
  }
}
