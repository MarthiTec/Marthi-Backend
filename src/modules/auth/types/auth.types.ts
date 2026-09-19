export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  provider: 'google' | 'password';
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  provider: 'google' | 'password';
};
