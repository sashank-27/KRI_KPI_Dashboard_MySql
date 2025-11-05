const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { connectDB } = require("./config/db");
const { setupAssociations } = require("./models/associations");
const { DatabaseAdmin } = require("./admin-utils");
const fs = require("fs");
const path = require("path");
const { getNetworkIPs, generateAllowedOrigins, displayNetworkInfo } = require("./utils/networkUtils");

const cors = require("cors");

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "uploads", "faqs")
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Get all network IPs and create allowed origins
const networkIPs = getNetworkIPs();
const allowedOrigins = generateAllowedOrigins(3000); // Frontend port

console.log('\n🔐 CORS Configuration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Allowed Origins:');
allowedOrigins.forEach((origin, index) => {
  console.log(`   ${index + 1}. ${origin}`);
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Display network information at startup
displayNetworkInfo(3000, 5000); // Frontend port, Backend port

const userRoutes = require("./routes/userRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const kraRoutes = require("./routes/kraRoutes");
const dailyTaskRoutes = require("./routes/dailyTaskRoutes");
const faqRoutes = require("./routes/faqRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow any localhost/127.0.0.1 origin on any port
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow any 172.17.x.x or 172.31.x.x IP (common private network ranges)
    if (origin.match(/^https?:\/\/(172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow any 192.168.x.x IP (common private network range)
    if (origin.match(/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow any 10.x.x.x IP (common private network range)
    if (origin.match(/^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
      return callback(null, true);
    }
    
    console.log(`⚠️  CORS blocked origin: ${origin}`);
    console.log(`   Allowed origins:`, allowedOrigins);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Health check route for frontend connectivity
app.get("/api/server-status", (req, res) => {
  res.json({ status: "ok", message: "Backend server is running" });
});

app.use("/api", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/kras", kraRoutes);
app.use("/api/daily-tasks", dailyTaskRoutes);
app.use("/api/faqs", faqRoutes);

app.get("/", (req, res) => {
  res.send("hello world");
});


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ NEW SOCKET CONNECTION');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.conn.transport.name);
  console.log('   Total Connections:', io.engine.clientsCount);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Join admin room for real-time updates
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log('👥 Socket', socket.id, 'joined admin-room');
    const roomSize = io.sockets.adapter.rooms.get('admin-room')?.size || 0;
    console.log('📊 Admin room now has', roomSize, 'members');
    // Send confirmation
    socket.emit('admin-room-joined', { 
      message: 'Successfully joined admin room',
      socketId: socket.id,
      roomSize: roomSize
    });
  });

  // Join user-specific room for escalated tasks
  socket.on('join-user-room', (userId) => {
    const roomName = `user-${userId}`;
    socket.join(roomName);
    console.log('👤 Socket', socket.id, 'joined', roomName);
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log('📊', roomName, 'now has', roomSize, 'members');
  });
  
  // Leave admin room
  socket.on('leave-admin-room', () => {
    socket.leave('admin-room');
    console.log('👋 Socket', socket.id, 'left admin-room');
    const roomSize = io.sockets.adapter.rooms.get('admin-room')?.size || 0;
    console.log('📊 Admin room now has', roomSize, 'members');
  });

  socket.on('disconnect', (reason) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ SOCKET DISCONNECTED');
    console.log('   Socket ID:', socket.id);
    console.log('   Reason:', reason);
    console.log('   Remaining Connections:', io.engine.clientsCount);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  socket.on('error', (error) => {
    console.error('💥 Socket error on', socket.id, ':', error);
  });

  // Handle transport upgrade
  socket.conn.on('upgrade', (transport) => {
    console.log('🔄 Socket', socket.id, 'upgraded to', transport.name);
  });
});

// Log when Socket.IO is ready
io.on('connect', () => {
  console.log('🚀 Socket.IO server is ready');
});

// Log server startup
console.log('🔧 Socket.IO server configured with CORS for:', allowedOrigins);

// Make io available to routes
app.set('io', io);

connectDB().then(async () => {
  console.log("✅ Database connected, setting up associations...");
  setupAssociations();
  console.log("✅ Database associations setup completed");
  
  // Run task_progress migration
  console.log("🔧 Running task_progress table migration...");
  try {
    const { migrateTaskProgress } = require("./migrations/add-task-progress-table");
    await migrateTaskProgress();
    console.log("✅ Task progress migration completed");
  } catch (error) {
    console.error("⚠️  Task progress migration error:", error.message);
    console.log("   (This is okay if table already exists)");
  }
  
  console.log("🔧 Running complete database setup...");
  const admin = new DatabaseAdmin();
  await admin.setupComplete();
  console.log("✅ Complete database setup finished, starting server...");
  server.listen(5000, '0.0.0.0', () => {
    console.log("🚀 Backend server started successfully!");
    console.log("\n📡 API Endpoints:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   • Local:      http://localhost:5000`);
    console.log(`   • Local (IP): http://127.0.0.1:5000`);
    
    networkIPs.forEach(ip => {
      console.log(`   • Network:    http://${ip}:5000`);
    });
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ CORS configured for ${allowedOrigins.length} origins`);
    console.log("🔗 Frontend can connect from any detected network interface\n");
  });
}).catch((error) => {
  console.error("❌ Failed to start server:", error);
});

