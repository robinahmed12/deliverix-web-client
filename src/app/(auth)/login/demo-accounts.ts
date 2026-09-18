export interface DemoAccount {
  role: string;
  email: string;
  password: string;
}

/**
 * Credentials for quick demo sign-in. Kept as a list so additional demo
 * accounts can be added later.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "Admin",
    email: "admin@deliverix.local",
    password: "Deliverix-Admin-1",
  },
];