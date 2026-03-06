import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import pollRoutes from "./routes/pollRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import { initializeSocket } from "./socket.js";
import { PollService } from "./services/PollService.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB with retry — the app must NOT crash if DB is temporarily unreachable
async function connectDB(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Log unexpected disconnections (no crash — mongoose auto-reconnects)
      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️  MongoDB disconnected — waiting for auto-reconnect");
      });
      mongoose.connection.on("reconnected", () => {
        console.log("✅ MongoDB reconnected");
      });
      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err.message);
      });

      return conn;
    } catch (error) {
      console.error(
        `❌ MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`,
      );
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delayMs / 1000}s…`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        // All retries exhausted — log and continue; API will return 503 until DB is up
        console.error(
          "❌ Could not connect to MongoDB after all retries. Server will continue without DB.",
        );
      }
    }
  }
}

// CORS origin: allow specific frontend in production, wildcard in dev
const CORS_ORIGIN = process.env.FRONTEND_URL || "*";

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// HTTP CORS middleware
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: return 503 for DB-dependent routes when MongoDB is not connected
app.use(["/api/polls", "/api/sessions"], (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database is temporarily unavailable. Please try again shortly.",
    });
  }
  next();
});

// Routes
app.use("/api/polls", pollRoutes);
app.use("/api/sessions", sessionRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Live Polling System Backend API",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    endpoints: {
      health: "/api/health",
      polls: "/api/polls",
      createPoll: "POST /api/polls/create",
      activePoll: "GET /api/polls/active",
      allPolls: "GET /api/polls/all",
    },
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    ["disconnected", "connected", "connecting", "disconnecting"][dbState] ??
    "unknown";
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? "OK" : "Degraded",
    message: "Server is running",
    database: dbStatus,
  });
});

// Connect to MongoDB on startup, then recover any live timers
(async () => {
  try {
    await connectDB();
    // Initialize Socket.io BEFORE recovery so setIo() is called
    initializeSocket(io);
    // Restart server-side timers for polls that were active when server stopped
    await PollService.recoverActivePolls();
  } catch (err) {
    console.error("Startup error:", err);
    // Socket.io still initialised even if recovery fails
    initializeSocket(io);
  }
})();

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});

// Export io instance for use in controllers
export { io };
