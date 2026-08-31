import { randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

import type { FolioGenerator } from '../../application/ports/folio-generator.port';

@Injectable()
export class TimestampFolioGenerator implements FolioGenerator {
  generate(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = randomBytes(2).toString('hex').toUpperCase();
    return `${timestamp.slice(-6)}${suffix}`;
  }
}
