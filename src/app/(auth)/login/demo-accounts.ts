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
  {
    role: "Dispatcher",
    email: "dispatcher.deliverix@yopmail.com",
    password: "Dispatcher@#12",
  },
  {
    role: "Customer",
    email: "customer.deliverix@yopmail.com",
    password: "Customer@#12",
  },
  {
    role: "Driver",
    email: "driver.deliverix@yopmail.com",
    password: "Driver@#12",
  },
  {
    role: "Support",
    email: "support.deliverix@yopmail.com",
    password: "Support@#12",
  },
];