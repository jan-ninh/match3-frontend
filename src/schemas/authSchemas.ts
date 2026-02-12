import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().trim().min(1, 'Email is required.').email('Please enter a valid email address.'),
    username: z
      .string()
      .trim()
      .min(1, 'Username is required.')
      .min(3, 'Username must be at least 3 characters.')
      .transform((v) => (v.length ? v[0].toUpperCase() + v.slice(1) : v)),
    password: z
      .string()
      .min(1, 'Password is required.')
      .min(6, 'Password must be at least 6 characters.')
      .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
      .regex(/\d/, 'Password must include at least one number.'),
    confirmPassword: z.string().min(1, 'Confirm password is required.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
