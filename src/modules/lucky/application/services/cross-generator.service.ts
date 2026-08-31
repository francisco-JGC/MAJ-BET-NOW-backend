import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

import {
  type CrossPayload,
} from '../../domain/entities/lucky-daily.entity';
import { LuckyKind } from '../../domain/value-objects/lucky-kind';

@Injectable()
export class CrossGenerator {
  generate(): CrossPayload {
    const d = (): number => randomInt(0, 10);
    const tl = d();
    const tr = d();
    const bl = d();
    const br = d();
    const n = d();
    const e = d();
    const s = d();
    const w = d();

    const pair = (a: number, b: number) =>
      `${a}${b}`.padStart(2, '0');

    return {
      kind: LuckyKind.CROSS,
      corners: { tl, tr, bl, br },
      inner: { n, e, s, w },
      // Ordering matches the example:
      //   top corners (83), bottom corners (45),
      //   north+east (06), west+south (27).
      recommended: [pair(tl, tr), pair(bl, br), pair(n, e), pair(w, s)],
    };
  }
}
