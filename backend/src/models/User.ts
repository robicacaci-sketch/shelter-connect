export interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
  providerId: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

