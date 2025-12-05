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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
// server/index.ts - FINAL WORKING VERSION
const dotenv_1 = __importDefault(require("dotenv"));
// Simple dotenv config
dotenv_1.default.config();
console.log("🔧 BREVO_API_KEY:", process.env.BREVO_API_KEY ? "✅ Found" : "❌ Not found");
// Rest of imports
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const static_1 = require("./static");
const email_1 = require("./email");
const http_1 = require("http");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express_1.default.urlencoded({ extended: false }));
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }
            log(logLine);
        }
    });
    next();
});
// Add test email endpoint before other routes
app.get("/api/test-email", async (req, res) => {
    try {
        const { sendEmail } = await Promise.resolve().then(() => __importStar(require("./email")));
        const success = await sendEmail("test@example.com", "🚀 Brevo API Test - Hackathon Website", `<h1>Test Email</h1><p>Brevo API is working!</p>`);
        res.json({
            success,
            message: "Test email sent via Brevo API",
            timestamp: new Date().toISOString(),
            service: "Brevo API"
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Email test failed",
            timestamp: new Date().toISOString()
        });
    }
});
// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: 'OK',
        service: 'Hackathon Platform',
        emailService: 'Brevo API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
(async () => {
    // Initialize email service
    try {
        const emailInitialized = await (0, email_1.initializeEmailService)();
        if (emailInitialized) {
            log("✅ Brevo API email service initialized successfully", "email");
        }
        else {
            log("⚠️  Email service running in console mode", "email");
        }
    }
    catch (error) {
        log(`❌ Email service error: ${error}`, "email");
    }
    // Register application routes
    await (0, routes_1.registerRoutes)(httpServer, app);
    // Global error handler
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        log(`❌ Error: ${message} (Status: ${status})`, "error");
        res.status(status).json({
            message,
            success: false,
            timestamp: new Date().toISOString()
        });
    });
    // Static file serving
    if (process.env.NODE_ENV === "production") {
        (0, static_1.serveStatic)(app);
        log("✅ Production mode - static files serving enabled", "static");
    }
    else {
        const { setupVite } = await Promise.resolve().then(() => __importStar(require("./vite")));
        await setupVite(httpServer, app);
        log("✅ Development mode - Vite server enabled", "vite");
    }
    // Server startup
    const port = parseInt(process.env.PORT || "8000", 10);
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    httpServer.listen(port, host, () => {
        log(`🚀 Hackathon server running on port ${port}`, "server");
        log(`📧 Email test: http://localhost:${port}/api/test-email`, "endpoints");
        log(`❤️  Health check: http://localhost:${port}/api/health`, "endpoints");
        if (process.env.BREVO_API_KEY) {
            log(`✅ Brevo API Key: Configured`, "email");
        }
        else {
            log(`❌ Brevo API Key: Not found`, "email");
        }
    });
})();
