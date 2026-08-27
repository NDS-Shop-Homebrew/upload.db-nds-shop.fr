import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import bcrypt from "bcrypt";
import prisma from "./prisma";

// --- Access control ---
const statement = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

const ac = createAccessControl(statement);

const superAdminRole = ac.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const adminRole = ac.newRole({
  user: ["create", "list", "ban", "set-password", "get", "update"],
  session: ["list", "revoke"],
});

const memberRole = ac.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
  appName: "NDS-Shop Admin",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 256,
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ password, hash }) => bcrypt.compare(password, hash),
    },
  },
  plugins: [
    username(),
    admin({
      ac,
      roles: {
        "super-admin": superAdminRole,
        admin: adminRole,
        member: memberRole,
      },
      adminRoles: ["super-admin", "admin"],
      defaultRole: "member",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || "https://upload.db-nds-shop.fr",
    "https://upload.db-nds-shop.fr",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3002",
  ].filter(Boolean) as string[],
});

export type Session = typeof auth.$Infer.Session;