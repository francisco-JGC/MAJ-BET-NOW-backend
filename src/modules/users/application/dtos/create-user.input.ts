import { UserRole } from '../../domain/value-objects/user-role';

export interface CreateUserInput {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
  nationalId?: string | null;
  paymentPercentage?: number | null;
  salePointId?: string | null;
  /** Auth context — set by the controller from the JWT. */
  requesterId: string;
  requesterRole: UserRole;
}
