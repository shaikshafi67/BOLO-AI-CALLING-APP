export interface User {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  preferredLanguage: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface CreateUserInput {
  firebaseUid: string;
  name: string;
  email: string;
  preferredLanguage: string;
}
