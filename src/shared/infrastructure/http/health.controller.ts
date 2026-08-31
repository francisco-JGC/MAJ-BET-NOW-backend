import { Controller, Get } from '@nestjs/common';

import { Public } from '../../../modules/auth/infrastructure/http/decorators/public.decorator';

/**
 * Liveness probe. Intentionally does NOT check the database — a DB blip
 * shouldn't restart the container in a loop; the app is still alive and
 * DB errors surface as 500s where they actually matter.
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
