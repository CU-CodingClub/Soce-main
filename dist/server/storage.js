"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.MongoStorage = void 0;
const mongodb_1 = require("mongodb");
const crypto_1 = require("crypto");
class MongoStorage {
    constructor() {
        this.client = new mongodb_1.MongoClient(process.env.MONGODB_URI || 'mongodb+srv://pandeyshashank039_db_user:CORzhNcyDkxfIWMb@cluster0.sbetcwr.mongodb.net/CSE?retryWrites=true&w=majority&appName=Cluster0');
        this.init();
    }
    async init() {
        try {
            await this.client.connect();
            this.db = this.client.db();
            console.log('✅ Connected to MongoDB');
            // Create default admin if not exists
            await this.createDefaultAdmin();
        }
        catch (error) {
            console.error('❌ MongoDB connection failed:', error);
        }
    }
    async createDefaultAdmin() {
        const adminExists = await this.getAdminByEmail("admin@tiffinbox.com");
        if (!adminExists) {
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
            const hashedPassword = await bcrypt.hash("admin123", 12);
            await this.createAdmin({
                name: "Admin",
                email: "admin@tiffinbox.com",
                password: hashedPassword,
            });
            console.log('✅ Default admin created');
        }
    }
    // YE NAYA METHOD ADD KARO
    async getAllUsers() {
        try {
            const users = await this.db.collection('users').find().sort({ createdAt: -1 }).toArray();
            return users;
        }
        catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }
    // Users - FIXED FUNCTIONS
    async getUser(id) {
        try {
            // Try as ObjectId first
            try {
                const user = await this.db.collection('users').findOne({
                    _id: new mongodb_1.ObjectId(id)
                });
                if (user)
                    return user;
            }
            catch (error) {
                // If ObjectId fails, try as string UUID
                const user = await this.db.collection('users').findOne({
                    id: id
                });
                return user || undefined;
            }
            return undefined;
        }
        catch (error) {
            console.error('Error getting user:', error);
            return undefined;
        }
    }
    async getUserByEmail(email) {
        return await this.db.collection('users').findOne({ email: email.toLowerCase() });
    }
    async createUser(insertUser) {
        const user = {
            ...insertUser,
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date(),
        };
        const result = await this.db.collection('users').insertOne({
            ...user,
            _id: new mongodb_1.ObjectId(),
        });
        return user;
    }
    async updateUser(id, updates) {
        try {
            // Try as ObjectId first
            try {
                const result = await this.db.collection('users').findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, { $set: { ...updates, updatedAt: new Date() } }, { returnDocument: "after" });
                if (result)
                    return result;
            }
            catch (error) {
                // If ObjectId fails, try as string UUID
                const result = await this.db.collection('users').findOneAndUpdate({ id: id }, { $set: { ...updates, updatedAt: new Date() } }, { returnDocument: "after" });
                return result || undefined;
            }
            return undefined;
        }
        catch (error) {
            console.error('Error updating user:', error);
            return undefined;
        }
    }
    async getUserCount() {
        return await this.db.collection('users').countDocuments();
    }
    // Admins
    async getAdmin(id) {
        try {
            // Try as ObjectId first
            try {
                const admin = await this.db.collection('admins').findOne({
                    _id: new mongodb_1.ObjectId(id)
                });
                if (admin)
                    return admin;
            }
            catch (error) {
                // If ObjectId fails, try as string UUID
                const admin = await this.db.collection('admins').findOne({
                    id: id
                });
                return admin || undefined;
            }
            return undefined;
        }
        catch (error) {
            console.error('Error getting admin:', error);
            return undefined;
        }
    }
    async getAdminByEmail(email) {
        return await this.db.collection('admins').findOne({ email: email.toLowerCase() });
    }
    async createAdmin(insertAdmin) {
        const admin = {
            ...insertAdmin,
            id: (0, crypto_1.randomUUID)(),
        };
        await this.db.collection('admins').insertOne({
            ...admin,
            _id: new mongodb_1.ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return admin;
    }
    // Password Resets
    async createPasswordReset(insertReset) {
        const reset = {
            ...insertReset,
            id: (0, crypto_1.randomUUID)(),
        };
        await this.db.collection('passwordResets').insertOne({
            ...reset,
            _id: new mongodb_1.ObjectId(),
            createdAt: new Date(),
        });
        return reset;
    }
    async getPasswordResetByToken(token) {
        return await this.db.collection('passwordResets').findOne({ token });
    }
    async deletePasswordReset(id) {
        await this.db.collection('passwordResets').deleteOne({ id });
    }
    // Hackathon Registrations
    async createHackathonRegistration(insertReg) {
        const registration = {
            ...insertReg,
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date(),
        };
        await this.db.collection('hackathonRegistrations').insertOne({
            ...registration,
            _id: new mongodb_1.ObjectId(),
        });
        return registration;
    }
    async getHackathonRegistrationByLeaderId(leaderId) {
        return await this.db.collection('hackathonRegistrations').findOne({ leaderId });
    }
    async getAllHackathonRegistrations() {
        const registrations = await this.db.collection('hackathonRegistrations').find().toArray();
        const registrationsWithMembers = await Promise.all(registrations.map(async (reg) => {
            const members = await this.getHackathonMembersByRegistrationId(reg.id);
            return {
                ...reg,
                members,
            };
        }));
        return registrationsWithMembers;
    }
    async deleteHackathonRegistration(id) {
        await this.deleteHackathonMembersByRegistrationId(id);
        await this.db.collection('hackathonRegistrations').deleteOne({ id });
    }
    async getHackathonRegistrationCount() {
        return await this.db.collection('hackathonRegistrations').countDocuments();
    }
    // Hackathon Members
    async createHackathonMember(insertMember) {
        const member = {
            ...insertMember,
            id: (0, crypto_1.randomUUID)(),
        };
        await this.db.collection('hackathonMembers').insertOne({
            ...member,
            _id: new mongodb_1.ObjectId(),
        });
        return member;
    }
    async getHackathonMembersByRegistrationId(registrationId) {
        return await this.db.collection('hackathonMembers')
            .find({ registrationId })
            .toArray();
    }
    async deleteHackathonMembersByRegistrationId(registrationId) {
        await this.db.collection('hackathonMembers').deleteMany({ registrationId });
    }
    // Workshop Registrations
    async createWorkshopRegistration(insertReg) {
        const registration = {
            ...insertReg,
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date(),
        };
        await this.db.collection('workshopRegistrations').insertOne({
            ...registration,
            _id: new mongodb_1.ObjectId(),
        });
        return registration;
    }
    async getWorkshopRegistrationByUserId(userId) {
        return await this.db.collection('workshopRegistrations').findOne({ userId });
    }
    async getWorkshopRegistrationByEmail(email) {
        return await this.db.collection('workshopRegistrations').findOne({ email: email.toLowerCase() });
    }
    async getAllWorkshopRegistrations() {
        return await this.db.collection('workshopRegistrations').find().toArray();
    }
    async deleteWorkshopRegistration(id) {
        await this.db.collection('workshopRegistrations').deleteOne({ id });
    }
    async getWorkshopRegistrationCount() {
        return await this.db.collection('workshopRegistrations').countDocuments();
    }
    // Stats
    async getStats() {
        const [totalUsers, totalHackathonTeams, totalWorkshopParticipants] = await Promise.all([
            this.getUserCount(),
            this.getHackathonRegistrationCount(),
            this.getWorkshopRegistrationCount(),
        ]);
        return {
            totalUsers,
            totalHackathonTeams,
            totalWorkshopParticipants,
        };
    }
}
exports.MongoStorage = MongoStorage;
// MongoDB storage use karo
exports.storage = new MongoStorage();
