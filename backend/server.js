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

// Connect to MongoDB only once and cache the connection
let cachedDb = null;
async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    cachedDb = conn;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
}

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
        allPolls: "GET /api/polls/all"
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: "Error", 
      message: "Failed to connect to database",
      error: error.message 
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
      database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
  } catch (error) {
    res.status(500).json({ 
      status: "Error", 
      message: error.message 
    });
  }
});

// Initialize Socket.io handlers
initializeSocket(io);

// Start server only in development (not on Vercel)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
  });
}

// Export io instance for use in controllers
export { io };

// Export app as default for Vercel
export default httpServer;
