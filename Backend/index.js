const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { connectDB } = require("./config/db");
const { setupAssociations } = require("./models/associations");
const User = require("./models/User");
const Department = require("./models/Department");
const bcrypt = require("bcryptjs");
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
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
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

async function seedSuperAdmin() {
  try {
    const { Op } = require("sequelize");
    const hash = await bcrypt.hash("Sashan12k", 10);
    
    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({
      where: {
        [Op.or]: [
          { email: "tyrone@netwebindia.com" },
          { username: "tyrone" }
        ]
      }
    });

    if (existingSuperAdmin) {
      console.log("Superadmin user already exists, updating...");
      await User.update({
        username: "tyrone",
        name: "Tyrone Super Admin",
        email: "tyrone@netwebindia.com",
        password: hash,
        role: "superadmin",
        isSuperAdmin: true,
        departmentId: null,
      }, {
        where: { id: existingSuperAdmin.id }
      });
    } else {
      console.log("Creating new superadmin user...");
      await User.create({
        username: "tyrone",
        name: "Tyrone Super Admin",
        email: "tyrone@netwebindia.com",
        password: hash,
        role: "superadmin",
        isSuperAdmin: true,
        departmentId: null,
      });
    }
    
    console.log("✅ Superadmin user ensured/updated successfully");
  } catch (error) {
    console.error("❌ Error seeding superadmin:", error.message);
    throw error;
  }
}


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  console.log('📊 Total connections:', io.engine.clientsCount);
  
  // Join admin room for real-time updates
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log('✅ User joined admin room:', socket.id);
    // Send confirmation
    socket.emit('admin-room-joined', { message: 'Successfully joined admin room' });
  });

  // Join user-specific room for escalated tasks
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log('✅ User joined user room:', socket.id, 'for user:', userId);
  });
  
  // Leave admin room
  socket.on('leave-admin-room', () => {
    socket.leave('admin-room');
    console.log('❌ User left admin room:', socket.id);
  });

  
  socket.on('disconnect', (reason) => {
    console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    console.log('📊 Remaining connections:', io.engine.clientsCount);
  });

  socket.on('error', (error) => {
    console.error('💥 Socket error:', error);
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
  console.log("✅ Database associations configured, seeding users...");
  await seedSuperAdmin();
  console.log("✅ Users seeded, starting server...");
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

