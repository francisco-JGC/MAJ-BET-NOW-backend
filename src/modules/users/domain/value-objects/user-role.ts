export enum UserRole {
  ADMIN = 'admin',
  /**
   * Owns a subset of sucursales (via `sale_points.owner_partner_id`). Logs
   * into the web panel like an admin, but every list/aggregate is scoped
   * to their sucursales — they never see other partners' data.
   */
  PARTNER = 'partner',
  SELLER = 'seller',
}
