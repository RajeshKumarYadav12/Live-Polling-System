# Backend - Live Polling System

Backend server for the Live Polling System using Node.js, Express.js, Socket.io, and MongoDB.

## Quick Start

```bash
# Install dependencies
npm install

# Start MongoDB (if using local)
mongod

# Start server
npm start

# Development mode with auto-reload
npm run dev
```

## Environment Variables

Create `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/live-polling
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## API Documentation

See main README.md for complete API documentation.

## Socket.io Events

See main README.md for Socket.io event documentation.
