export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenPayload {
  sub: string;
  username: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Discriminator so a stolen access token can't be replayed as a refresh. */
  type: 'refresh';
}

export interface TokenService {
  sign(payload: TokenPayload): Promise<string>;
  verify(token: string): Promise<TokenPayload>;
  /** Long-lived token whose only purpose is minting new access tokens. */
  signRefresh(userId: string): Promise<string>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}
