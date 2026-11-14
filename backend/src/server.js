import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import corsOptions from './config/corsConfig.js';
import app from './app.js';
import connectDB from './config/db.js';
import initSocketHandler from './sockets/socketHandler.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with production CORS
const io = new Server(server, {
  cors: corsOptions,
});

// Provide socket instance to Express controllers via req.app.get('io')
app.set('io', io);

// Initialize real-time Socket.io events
initSocketHandler(io);

// Connect to Database & Start Server
const startServer = async () => {
  try {
    if (process.env.MONGO_URI) {
      await connectDB();
    } else {
      console.warn('[MongoDB] MONGO_URI is not set in .env yet. Database connection skipped.');
    }

    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 Instagram Clone Server running on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`⚡ Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export { io, server };
