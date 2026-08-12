import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import bcrypt from "bcrypt";
import prisma from "./prisma.ts";

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

// super-admin : tout (gestion comptes + rôles + ban)
const superAdmin = ac.newRole({
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});

// admin : peut voir la liste et le détail, pas de suppression
const adminRole = ac.newRole({
  user: ["list", "get"],
  session: ["list"],
});

// member : équipe, accès au back-office sans gestion users
const member = ac.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
  appName: "NDS-Shop Admin",
  baseURL: process.env.BETTER_AUTH_URL || undefined,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 256,
    // Reprise du hachage bcrypt existant pour migrer l'admin sans reset
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
        "super-admin": superAdmin,
        admin: adminRole,
        member,
      },
      adminRoles: ["super-admin"],
      defaultRole: "member",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // refresh quotidien
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10, // 10 tentatives de connexion / minute
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },
  trustedOrigins: [
    "https://upload.db-nds-shop.fr",
    "http://localhost:5173",
    "http://localhost:3002",
  ],
});

export type Session = typeof auth.$Infer.Session;
