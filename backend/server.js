import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import pollRoutes from "./routes/pollRoutes.js";
import { initializeSocket } from "./socket.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
}

// Initialize Socket.io with CORS - Allow all origins
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware - Allow all origins for Vercel deployment
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/polls", pollRoutes);

// Root route
app.get("/", async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: "OK",
      message: "Live Polling System Backend API",
      database: "Connected",
      endpoints: {
        health: "/api/health",
        polls: "/api/polls",
        createPoll: "POST /api/polls/create",
        activePoll: "GET /api/polls/active",
        allPolls: "GET /api/polls/all",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Failed to connect to database",
      error: error.message,
    });
  }
});

// Health check route
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: "OK",
      message: "Server is running",
      database:
        mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
});

// Connect to MongoDB on startup
connectDB();

// Initialize Socket.io handlers
initializeSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});

// Export io instance for use in controllers
export { io };
