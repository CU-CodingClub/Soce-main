"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.workshopFormSchema = exports.hackathonFormSchema = exports.teamMemberSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.signupSchema = exports.loginSchema = exports.insertPasswordResetSchema = exports.insertWorkshopRegistrationSchema = exports.insertHackathonMemberSchema = exports.insertHackathonRegistrationSchema = exports.insertAdminSchema = exports.insertUserSchema = exports.passwordResets = exports.workshopRegistrations = exports.hackathonMembers = exports.hackathonRegistrations = exports.admins = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Users table - for regular users
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    college: (0, pg_core_1.text)("college"),
    year: (0, pg_core_1.text)("year"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Admins table - separate admin credentials
exports.admins = (0, pg_core_1.pgTable)("admins", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
});
// Hackathon registrations - team leader info
exports.hackathonRegistrations = (0, pg_core_1.pgTable)("hackathon_registrations", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    teamName: (0, pg_core_1.text)("team_name").notNull(),
    leaderId: (0, pg_core_1.varchar)("leader_id", { length: 36 }).notNull(),
    leaderName: (0, pg_core_1.text)("leader_name").notNull(),
    leaderEmail: (0, pg_core_1.text)("leader_email").notNull(),
    leaderPhone: (0, pg_core_1.text)("leader_phone").notNull(),
    leaderCollege: (0, pg_core_1.text)("leader_college").notNull(),
    leaderYear: (0, pg_core_1.text)("leader_year").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Hackathon team members
exports.hackathonMembers = (0, pg_core_1.pgTable)("hackathon_members", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    registrationId: (0, pg_core_1.varchar)("registration_id", { length: 36 }).notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone").notNull(),
});
// Workshop registrations - individual participants
exports.workshopRegistrations = (0, pg_core_1.pgTable)("workshop_registrations", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id", { length: 36 }).notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone").notNull(),
    college: (0, pg_core_1.text)("college").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Password reset tokens
exports.passwordResets = (0, pg_core_1.pgTable)("password_resets", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    email: (0, pg_core_1.text)("email").notNull(),
    token: (0, pg_core_1.text)("token").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
});
// Insert schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({ id: true, createdAt: true });
exports.insertAdminSchema = (0, drizzle_zod_1.createInsertSchema)(exports.admins).omit({ id: true });
exports.insertHackathonRegistrationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.hackathonRegistrations).omit({ id: true, createdAt: true });
exports.insertHackathonMemberSchema = (0, drizzle_zod_1.createInsertSchema)(exports.hackathonMembers).omit({ id: true });
exports.insertWorkshopRegistrationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workshopRegistrations).omit({ id: true, createdAt: true });
exports.insertPasswordResetSchema = (0, drizzle_zod_1.createInsertSchema)(exports.passwordResets).omit({ id: true });
// Auth schemas
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Team member schema for hackathon
exports.teamMemberSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    email: zod_1.z.string().email("Invalid email"),
    phone: zod_1.z.string().min(10, "Valid phone required"),
});
// Hackathon registration form schema
exports.hackathonFormSchema = zod_1.z.object({
    teamName: zod_1.z.string().min(2, "Team name is required"),
    leaderName: zod_1.z.string().min(2, "Name is required"),
    leaderEmail: zod_1.z.string().email("Invalid email"),
    leaderPhone: zod_1.z.string().min(10, "Valid phone required"),
    leaderCollege: zod_1.z.string().min(2, "College is required"),
    leaderYear: zod_1.z.string().min(1, "Year is required"),
    members: zod_1.z.array(exports.teamMemberSchema).min(0).max(4),
});
// Workshop registration form schema
exports.workshopFormSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    email: zod_1.z.string().email("Invalid email"),
    phone: zod_1.z.string().min(10, "Valid phone required"),
    college: zod_1.z.string().min(2, "College is required"),
});
// Profile update schema
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    phone: zod_1.z.string().optional(),
    college: zod_1.z.string().optional(),
    year: zod_1.z.string().optional(),
});
