import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Raw,
  Repository,
} from 'typeorm';
import type { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';

import { BUSINESS_TZ } from '../../../../../shared/domain/business-time';
import type { Ticket } from '../../../domain/entities/ticket.entity';
import type {
  FindTicketsFilters,
  TicketsRepository,
} from '../../../domain/repositories/tickets.repository';
import { TicketLineOrmEntity } from '../entities/ticket-line.orm-entity';
import { TicketOrmEntity } from '../entities/ticket.orm-entity';
import { TicketMapper } from '../mappers/ticket.mapper';

@Injectable()
export class TypeOrmTicketsRepository implements TicketsRepository {
  private readonly logger = new Logger(TypeOrmTicketsRepository.name);

  constructor(
    @InjectRepository(TicketOrmEntity)
    private readonly repo: Repository<TicketOrmEntity>,
    @InjectRepository(TicketLineOrmEntity)
    private readonly linesRepo: Repository<TicketLineOrmEntity>,
  ) {}

  async save(ticket: Ticket): Promise<void> {
    const orm = TicketMapper.toOrm(ticket);
    const lines = orm.lines;
    orm.lines = [];

    const tag = `[folio=${orm.folio} id=${orm.id}]`;
    this.logger.log(`${tag} save() iniciado — líneas recibidas: ${lines.length}, labels: [${lines.map((l) => l.label).join(', ')}]`);

    try {
      await this.repo.manager.transaction(async (manager) => {
        const isNew = !(await manager.existsBy(TicketOrmEntity, { id: orm.id }));
        this.logger.log(`${tag} transacción abierta — isNew=${isNew}`);

        if (isNew) {
          if (lines.length === 0) {
            this.logger.error(`${tag} ABORTADO: lines.length === 0 antes del INSERT`);
            throw new Error(
              `Ticket ${orm.id} se creó sin líneas — save abortado para evitar datos corruptos`,
            );
          }

          this.logger.log(`${tag} INSERT header...`);
          await manager.insert(TicketOrmEntity, orm);
          this.logger.log(`${tag} INSERT header OK`);

          this.logger.log(`${tag} INSERT ${lines.length} líneas...`);
          await manager.insert(TicketLineOrmEntity, lines);
          this.logger.log(`${tag} INSERT líneas OK`);

          const savedCount = await manager.count(TicketLineOrmEntity, {
            where: { ticketId: orm.id },
          });
          this.logger.log(`${tag} COUNT dentro de TX: ${savedCount} (esperado ${lines.length})`);

          if (savedCount !== lines.length) {
            this.logger.error(`${tag} ABORTADO: mismatch de líneas — esperado ${lines.length}, en TX=${savedCount}`);
            throw new Error(
              `Ticket ${orm.id}: se esperaban ${lines.length} líneas pero se persistieron ${savedCount} — save abortado`,
            );
          }

          this.logger.log(`${tag} verificación OK — haciendo commit...`);
        } else {
          this.logger.log(`${tag} UPDATE header (void/payment) status=${orm.status}`);
          await manager.update(TicketOrmEntity, { id: orm.id }, {
            status: orm.status,
            voidedAt: orm.voidedAt,
            voidedReason: orm.voidedReason,
            paidAt: orm.paidAt,
            paidById: orm.paidById,
            paidPrize: orm.paidPrize,
            updatedAt: orm.updatedAt,
          });
          this.logger.log(`${tag} UPDATE header OK`);
        }
      });

      this.logger.log(`${tag} save() completado y committeado`);
    } catch (err) {
      this.logger.error(`${tag} save() FALLÓ — rollback ejecutado. Error: ${(err as Error).message}`);
      throw err;
    }
  }

  async findById(id: string): Promise<Ticket | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? TicketMapper.toDomain(found) : null;
  }

  async findByFolio(folio: string): Promise<Ticket | null> {
    const found = await this.repo.findOne({ where: { folio } });
    return found ? TicketMapper.toDomain(found) : null;
  }

  async findByClientRequestId(clientRequestId: string): Promise<Ticket | null> {
    const found = await this.repo.findOne({ where: { clientRequestId } });
    return found ? TicketMapper.toDomain(found) : null;
  }

  async findMany(filters: FindTicketsFilters): Promise<Ticket[]> {
    // Partner scoping with an empty allow-list means "nothing accessible".
    if (filters.salePointIds && filters.salePointIds.length === 0) return [];

    // Use QueryBuilder with explicit LEFT JOIN instead of repo.find() so that
    // TypeORM does NOT use its two-phase eager-loading strategy (get IDs first,
    // then WHERE id IN (…)). That strategy generates a bind message with
    // N format codes but 0 parameter values when N is large — a pg driver bug
    // triggered by high `take` limits (e.g. 100 000 for the winning-tickets
    // and balance use-cases), causing PostgreSQL to reject with
    // "bind message has N parameter formats but 0 parameters".
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.lines', 'lines')
      .orderBy('t.createdAt', 'DESC');

    if (filters.limit !== undefined) qb.take(filters.limit);
    if (filters.offset !== undefined) qb.skip(filters.offset);

    this.applyWhereToQb(qb, filters);

    const rows = await qb.getMany();
    return rows.map((row) => TicketMapper.toDomain(row));
  }

  countMany(filters: FindTicketsFilters): Promise<number> {
    if (filters.salePointIds && filters.salePointIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.repo.count({ where: this.buildWhere(filters) });
  }

  private buildWhere(
    filters: FindTicketsFilters,
  ):
    | FindOptionsWhere<TicketOrmEntity>
    | FindOptionsWhere<TicketOrmEntity>[] {
    const base: FindOptionsWhere<TicketOrmEntity> = {};
    if (filters.sellerId) base.sellerId = filters.sellerId;
    if (filters.salePointId) {
      base.salePointId = filters.salePointId;
    } else if (filters.salePointIds && filters.salePointIds.length > 0) {
      base.salePointId = In(filters.salePointIds);
    }
    if (filters.gameId) base.gameId = filters.gameId;
    if (filters.status) base.status = filters.status;
    if (filters.drawFrom && filters.drawTo) {
      base.drawAt = Between(filters.drawFrom, filters.drawTo);
    } else if (filters.drawFrom) {
      base.drawAt = MoreThanOrEqual(filters.drawFrom);
    } else if (filters.drawTo) {
      base.drawAt = LessThanOrEqual(filters.drawTo);
    } else if (filters.from && filters.to) {
      base.createdAt = Between(filters.from, filters.to);
    } else if (filters.from) {
      base.createdAt = MoreThanOrEqual(filters.from);
    } else if (filters.to) {
      base.createdAt = LessThanOrEqual(filters.to);
    }
    if (filters.drawTime) {
      // Match "wall-clock time in Managua" — same schedule (e.g. 11:00)
      // across every day in the from/to range.
      base.drawAt = Raw(
        (alias) =>
          `to_char(${alias} AT TIME ZONE '${BUSINESS_TZ}', 'HH24:MI') = :drawTime`,
        { drawTime: filters.drawTime },
      );
    }

    const term = filters.search?.trim();
    if (!term) return base;
    // OR entre folio (prefix, uppercase — el generator emite MAYÚSCULAS)
    // y cliente (anywhere, case-insensitive). Devolver un array de
    // `FindOptionsWhere` le indica a TypeORM que combine los items con
    // OR, manteniendo cada uno los filtros comunes (AND).
    return [
      {
        ...base,
        folio: Raw((alias) => `${alias} ILIKE :folioTerm`, {
          folioTerm: `${term}%`,
        }),
      },
      {
        ...base,
        client: Raw((alias) => `${alias} ILIKE :clientTerm`, {
          clientTerm: `%${term}%`,
        }),
      },
    ];
  }

  private applyWhereToQb(
    qb: SelectQueryBuilder<TicketOrmEntity>,
    filters: FindTicketsFilters,
  ): void {
    if (filters.sellerId) {
      qb.andWhere('t.sellerId = :sellerId', { sellerId: filters.sellerId });
    }
    if (filters.salePointId) {
      qb.andWhere('t.salePointId = :salePointId', {
        salePointId: filters.salePointId,
      });
    } else if (filters.salePointIds && filters.salePointIds.length > 0) {
      qb.andWhere('t.salePointId IN (:...salePointIds)', {
        salePointIds: filters.salePointIds,
      });
    }
    if (filters.gameId) {
      qb.andWhere('t.gameId = :gameId', { gameId: filters.gameId });
    }
    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.drawFrom && filters.drawTo) {
      qb.andWhere('t.drawAt BETWEEN :drawFrom AND :drawTo', {
        drawFrom: filters.drawFrom,
        drawTo: filters.drawTo,
      });
    } else if (filters.drawFrom) {
      qb.andWhere('t.drawAt >= :drawFrom', { drawFrom: filters.drawFrom });
    } else if (filters.drawTo) {
      qb.andWhere('t.drawAt <= :drawTo', { drawTo: filters.drawTo });
    } else if (filters.from && filters.to) {
      qb.andWhere('t.createdAt BETWEEN :from AND :to', {
        from: filters.from,
        to: filters.to,
      });
    } else if (filters.from) {
      qb.andWhere('t.createdAt >= :from', { from: filters.from });
    } else if (filters.to) {
      qb.andWhere('t.createdAt <= :to', { to: filters.to });
    }
    if (filters.drawTime) {
      qb.andWhere(
        `to_char(t.drawAt AT TIME ZONE '${BUSINESS_TZ}', 'HH24:MI') = :drawTime`,
        { drawTime: filters.drawTime },
      );
    }
    const term = filters.search?.trim();
    if (term) {
      qb.andWhere('(t.folio ILIKE :folioTerm OR t.client ILIKE :clientTerm)', {
        folioTerm: `${term}%`,
        clientTerm: `%${term}%`,
      });
    }
  }
}
