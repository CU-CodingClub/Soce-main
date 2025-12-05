"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const storage_1 = require("./storage");
const email_1 = require("./email");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const schema_1 = require("@shared/schema");
const zod_1 = require("zod");
const JWT_SECRET = process.env.SESSION_SECRET || "techfest-secret-key-2025";
// Middleware to verify JWT token for users
function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.type !== "user") {
            return res.status(401).json({ message: "Invalid token type" });
        }
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
// Middleware to verify JWT token for admins
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.type !== "admin") {
            return res.status(401).json({ message: "Invalid token type" });
        }
        req.adminId = decoded.adminId;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
async function registerRoutes(httpServer, app) {
    // ========== AUTH ROUTES ==========
    // User Signup
    app.post("/api/auth/signup", async (req, res) => {
        try {
            const data = schema_1.signupSchema.parse(req.body);
            // Check if user already exists
            const existingUser = await storage_1.storage.getUserByEmail(data.email);
            if (existingUser) {
                return res.status(400).json({ message: "Email already registered" });
            }
            // Hash password
            const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
            // Create user
            const user = await storage_1.storage.createUser({
                name: data.name,
                email: data.email,
                password: hashedPassword,
                phone: null,
                college: null,
                year: null,
            });
            // Generate token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, type: "user" }, JWT_SECRET, {
                expiresIn: "7d",
            });
            // Send welcome email
            await (0, email_1.sendEmail)(user.email, "Welcome to TechFest 2025!", `<h1>Welcome, ${user.name}!</h1><p>Your account has been created successfully. You can now register for events.</p>`);
            const { password: _, ...userWithoutPassword } = user;
            res.json({ user: userWithoutPassword, token });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Signup error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // User Login
    app.post("/api/auth/login", async (req, res) => {
        try {
            const data = schema_1.loginSchema.parse(req.body);
            const user = await storage_1.storage.getUserByEmail(data.email);
            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }
            const validPassword = await bcryptjs_1.default.compare(data.password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, type: "user" }, JWT_SECRET, {
                expiresIn: "7d",
            });
            const { password: _, ...userWithoutPassword } = user;
            res.json({ user: userWithoutPassword, token });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Login error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Forgot Password
    app.post("/api/auth/forgot-password", async (req, res) => {
        try {
            const data = schema_1.forgotPasswordSchema.parse(req.body);
            const user = await storage_1.storage.getUserByEmail(data.email);
            if (!user) {
                // Don't reveal if email exists
                return res.json({ message: "If email exists, reset link will be sent" });
            }
            // Generate reset token
            const resetToken = (0, crypto_1.randomBytes)(32).toString("hex");
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour
            await storage_1.storage.createPasswordReset({
                email: user.email,
                token: resetToken,
                expiresAt,
            });
            // Send reset email
            await (0, email_1.sendEmail)(user.email, "Password Reset - TechFest 2025", `<h1>Password Reset</h1><p>Click the link to reset your password: <a href="/reset-password?token=${resetToken}">Reset Password</a></p><p>This link expires in 1 hour.</p>`);
            res.json({ message: "If email exists, reset link will be sent" });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Forgot password error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ========== USER ROUTES ==========
    // Get user registrations
    app.get("/api/user/registrations", authenticateUser, async (req, res) => {
        try {
            const userId = req.userId;
            const hackathonReg = await storage_1.storage.getHackathonRegistrationByLeaderId(userId);
            const workshopReg = await storage_1.storage.getWorkshopRegistrationByUserId(userId);
            let hackathonWithMembers = null;
            if (hackathonReg) {
                const members = await storage_1.storage.getHackathonMembersByRegistrationId(hackathonReg.id);
                hackathonWithMembers = { ...hackathonReg, members };
            }
            res.json({
                hackathon: hackathonWithMembers,
                workshop: workshopReg,
            });
        }
        catch (error) {
            console.error("Get registrations error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Update user profile
    // Update user profile - REMOVE VALIDATION
    app.patch("/api/user/profile", authenticateUser, async (req, res) => {
        try {
            const userId = req.userId;
            // Debug: Check what userId is coming
            console.log('User ID received:', userId, 'Type:', typeof userId);
            // REMOVE THIS VALIDATION COMPLETELY
            // if (typeof userId !== 'string' || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
            //   console.error('Invalid user ID format:', userId);
            //   return res.status(400).json({ message: "Invalid user ID format" });
            // }
            // Just check if userId exists
            if (!userId) {
                return res.status(400).json({ message: "User ID is required" });
            }
            const data = schema_1.updateProfileSchema.parse(req.body);
            const updatedUser = await storage_1.storage.updateUser(userId, data);
            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            const { password: _, ...userWithoutPassword } = updatedUser;
            res.json({ user: userWithoutPassword });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Update profile error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ========== HACKATHON ROUTES ==========
    // Register for hackathon
    app.post("/api/hackathon/register", authenticateUser, async (req, res) => {
        try {
            const userId = req.userId;
            const data = schema_1.hackathonFormSchema.parse(req.body);
            // Check if already registered
            const existingReg = await storage_1.storage.getHackathonRegistrationByLeaderId(userId);
            if (existingReg) {
                return res.status(400).json({ message: "You have already registered a team" });
            }
            // Check for duplicate member emails
            const allEmails = [data.leaderEmail, ...data.members.map((m) => m.email)];
            const uniqueEmails = new Set(allEmails.map((e) => e.toLowerCase()));
            if (uniqueEmails.size !== allEmails.length) {
                return res.status(400).json({ message: "Duplicate email addresses found" });
            }
            // Create registration
            const registration = await storage_1.storage.createHackathonRegistration({
                teamName: data.teamName,
                leaderId: userId,
                leaderName: data.leaderName,
                leaderEmail: data.leaderEmail,
                leaderPhone: data.leaderPhone,
                leaderCollege: data.leaderCollege,
                leaderYear: data.leaderYear,
            });
            // Add team members
            for (const member of data.members) {
                await storage_1.storage.createHackathonMember({
                    registrationId: registration.id,
                    name: member.name,
                    email: member.email,
                    phone: member.phone,
                });
            }
            // Send confirmation email
            await (0, email_1.sendEmail)(data.leaderEmail, "Hackathon Registration Confirmed - TechFest 2025", `<h1>Registration Confirmed!</h1>
        <p>Hi ${data.leaderName},</p>
        <p>Your team <strong>${data.teamName}</strong> has been successfully registered for Hackathon 2025!</p>
        <h3>Team Details:</h3>
        <ul>
          <li>Team Name: ${data.teamName}</li>
          <li>Team Leader: ${data.leaderName}</li>
          <li>Total Members: ${data.members.length + 1}</li>
        </ul>
        <p>Event Date: March 15-17, 2025</p>
        <p>We're excited to have you!</p>`);
            res.json({ message: "Registration successful", registration });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Hackathon registration error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ========== WORKSHOP ROUTES ==========
    // Register for workshop
    app.post("/api/workshop/register", authenticateUser, async (req, res) => {
        try {
            const userId = req.userId;
            const data = schema_1.workshopFormSchema.parse(req.body);
            // Check if already registered
            const existingReg = await storage_1.storage.getWorkshopRegistrationByUserId(userId);
            if (existingReg) {
                return res.status(400).json({ message: "You have already registered for the workshop" });
            }
            // Check if email already used
            const emailReg = await storage_1.storage.getWorkshopRegistrationByEmail(data.email);
            if (emailReg) {
                return res.status(400).json({ message: "This email is already registered" });
            }
            // Create registration
            const registration = await storage_1.storage.createWorkshopRegistration({
                userId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                college: data.college,
            });
            // Send confirmation email
            await (0, email_1.sendEmail)(data.email, "Workshop Registration Confirmed - TechFest 2025", `<h1>Registration Confirmed!</h1>
        <p>Hi ${data.name},</p>
        <p>You have been successfully registered for the Python Workshop!</p>
        <h3>Your Details:</h3>
        <ul>
          <li>Name: ${data.name}</li>
          <li>Email: ${data.email}</li>
          <li>College: ${data.college}</li>
        </ul>
        <p>Event Date: April 5-6, 2025</p>
        <p>You will receive a certificate upon completion.</p>
        <p>We're excited to have you!</p>`);
            res.json({ message: "Registration successful", registration });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Workshop registration error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ========== ADMIN ROUTES ==========
    // Admin Login
    app.post("/api/admin/login", async (req, res) => {
        try {
            const data = schema_1.loginSchema.parse(req.body);
            const admin = await storage_1.storage.getAdminByEmail(data.email);
            if (!admin) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            const validPassword = await bcryptjs_1.default.compare(data.password, admin.password);
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            const token = jsonwebtoken_1.default.sign({ adminId: admin.id, type: "admin" }, JWT_SECRET, {
                expiresIn: "7d",
            });
            const { password: _, ...adminWithoutPassword } = admin;
            res.json({ admin: adminWithoutPassword, token });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Admin login error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Get admin stats
    app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
        try {
            const stats = await storage_1.storage.getStats();
            res.json(stats);
        }
        catch (error) {
            console.error("Get stats error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Get all hackathon registrations
    app.get("/api/admin/hackathon", authenticateAdmin, async (req, res) => {
        try {
            const registrations = await storage_1.storage.getAllHackathonRegistrations();
            res.json(registrations);
        }
        catch (error) {
            console.error("Get hackathon registrations error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Delete hackathon registration
    app.delete("/api/admin/hackathon/:id", authenticateAdmin, async (req, res) => {
        try {
            await storage_1.storage.deleteHackathonRegistration(req.params.id);
            res.json({ message: "Registration deleted" });
        }
        catch (error) {
            console.error("Delete hackathon registration error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Get all workshop registrations
    app.get("/api/admin/workshop", authenticateAdmin, async (req, res) => {
        try {
            const registrations = await storage_1.storage.getAllWorkshopRegistrations();
            res.json(registrations);
        }
        catch (error) {
            console.error("Get workshop registrations error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Delete workshop registration
    app.delete("/api/admin/workshop/:id", authenticateAdmin, async (req, res) => {
        try {
            await storage_1.storage.deleteWorkshopRegistration(req.params.id);
            res.json({ message: "Registration deleted" });
        }
        catch (error) {
            console.error("Delete workshop registration error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Export CSV - Hackathon
    app.get("/api/admin/export/hackathon", authenticateAdmin, async (req, res) => {
        try {
            const registrations = await storage_1.storage.getAllHackathonRegistrations();
            let csv = "Team Name,Leader Name,Leader Email,Leader Phone,Leader College,Leader Year,Member Names,Member Emails,Member Phones\n";
            for (const reg of registrations) {
                const memberNames = reg.members.map((m) => m.name).join("; ");
                const memberEmails = reg.members.map((m) => m.email).join("; ");
                const memberPhones = reg.members.map((m) => m.phone).join("; ");
                csv += `"${reg.teamName}","${reg.leaderName}","${reg.leaderEmail}","${reg.leaderPhone}","${reg.leaderCollege}","${reg.leaderYear}","${memberNames}","${memberEmails}","${memberPhones}"\n`;
            }
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=hackathon_registrations.csv");
            res.send(csv);
        }
        catch (error) {
            console.error("Export hackathon CSV error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Export CSV - Workshop
    app.get("/api/admin/export/workshop", authenticateAdmin, async (req, res) => {
        try {
            const registrations = await storage_1.storage.getAllWorkshopRegistrations();
            let csv = "Name,Email,Phone,College,Registered At\n";
            for (const reg of registrations) {
                csv += `"${reg.name}","${reg.email}","${reg.phone}","${reg.college}","${reg.createdAt}"\n`;
            }
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=workshop_registrations.csv");
            res.send(csv);
        }
        catch (error) {
            console.error("Export workshop CSV error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Export CSV - All Users (NEW ROUTE)
    app.get("/api/admin/export/users", authenticateAdmin, async (req, res) => {
        try {
            // Get all users from MongoDB
            const users = await storage_1.storage.getAllUsers();
            // Create CSV header with proper spacing for readability
            let csv = "ID,Name,Email,Created On\n";
            // Add each user to CSV with proper formatting
            for (const user of users) {
                // Format date to be more readable
                const createdAt = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : '';
                // Escape quotes and handle missing values
                const name = user.name ? `"${user.name.replace(/"/g, '""')}"` : '""';
                const email = user.email ? `"${user.email.replace(/"/g, '""')}"` : '""';
                const id = user.id ? `"${user.id.replace(/"/g, '""')}"` : '""';
                const created = createdAt ? `"${createdAt.replace(/"/g, '""')}"` : '""';
                // Add row with proper spacing
                csv += `${id},${name},${email},${created}\n`;
            }
            // Set headers for file download
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
            res.send(csv);
        }
        catch (error) {
            console.error("Export users CSV error:", error);
            res.status(500).json({ message: "Failed to export users data" });
        }
    });
    return httpServer;
}
