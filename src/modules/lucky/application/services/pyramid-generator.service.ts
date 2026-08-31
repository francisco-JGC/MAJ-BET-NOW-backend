import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

import {
  type PyramidPayload,
} from '../../domain/entities/lucky-daily.entity';
import { LuckyKind } from '../../domain/value-objects/lucky-kind';

const TOP_ROW_LENGTH = 8;

@Injectable()
export class PyramidGenerator {
  generate(): PyramidPayload {
    const rows: number[][] = [];

    // Top row: 8 random digits.
    const top: number[] = [];
    for (let i = 0; i < TOP_ROW_LENGTH; i++) top.push(randomInt(0, 10));
    rows.push(top);

    // Each subsequent row: sum mod 10 of adjacent pairs above.
    for (let r = 1; r < TOP_ROW_LENGTH; r++) {
      const previous = rows[r - 1];
      const current: number[] = [];
      for (let i = 0; i < previous.length - 1; i++) {
        current.push((previous[i] + previous[i + 1]) % 10);
      }
      rows.push(current);
    }

    // Recommended pairs: (a,b) = second-to-last row, c = base.
    const penult = rows[rows.length - 2];
    const base = rows[rows.length - 1][0];
    const a = penult[0];
    const b = penult[1];
    const pair = (x: number, y: number) => `${x}${y}`.padStart(2, '0');

    return {
      kind: LuckyKind.PYRAMID,
      rows,
      recommended: [pair(a, b), pair(b, base), pair(base, a)],
    };
  }
}
