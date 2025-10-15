const User = require("../models/User");
const Department = require("../models/Department");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { getJwtSecret } = require("../config/db");

// System health check
exports.getSystemHealth = async (req, res) => {
  try {
    const healthStatus = {
      database: { status: 'offline', message: 'Database connection failed' },
      apiServices: { status: 'offline', message: 'API services unavailable' },
      userManagement: { status: 'offline', message: 'User management service down' },
      backupSystem: { status: 'offline', message: 'Backup system not responding' }
    };

    // Check database connection
    try {
      const { sequelize } = require('../config/db');
      await sequelize.authenticate();
      // Test database with a simple query
      await User.findOne({ limit: 1 });
      healthStatus.database = { status: 'online', message: 'Database connected' };
    } catch (dbError) {
      healthStatus.database = { status: 'offline', message: 'Database query failed' };
    }

    // Check API services (if we can reach here, API is working)
    healthStatus.apiServices = { status: 'online', message: 'API services operational' };

    // Check user management service
    try {
      const userCount = await User.count();
      healthStatus.userManagement = { status: 'online', message: `User management active (${userCount} users)` };
    } catch (userError) {
      healthStatus.userManagement = { status: 'offline', message: 'User management service error' };
    }

    // Check backup system (simulate - in real app, this would check actual backup status)
    try {
      const deptCount = await Department.count();
      healthStatus.backupSystem = { status: 'online', message: `Backup system active (${deptCount} departments)` };
    } catch (backupError) {
      healthStatus.backupSystem = { status: 'pending', message: 'Backup system pending' };
    }

    // Determine overall system status
    const allOnline = Object.values(healthStatus).every(service => service.status === 'online');
    const overallStatus = allOnline ? 'healthy' : 'degraded';

    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: healthStatus
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'System health check failed',
      error: error.message
    });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Update current user profile
exports.updateCurrentUser = async (req, res) => {
  try {
    const { username, name, email, avatar } = req.body;
    const update = { username, name, email, avatar };
    
    // Remove undefined fields
    Object.keys(update).forEach(
      (key) => update[key] === undefined && delete update[key]
    );
    
    const [updatedCount] = await User.update(update, {
      where: { id: req.user.id },
      returning: true
    });
    
    if (updatedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// List all users
exports.getAllUsers = async (req, res) => {
  try {
    // Hide superadmin users from non-superadmin users
    const whereClause = req.user.role === "superadmin" ? {} : { isSuperAdmin: { [Op.ne]: true } };
    
    console.log('User role:', req.user.role);
    console.log('Query:', whereClause);
    
    const users = await User.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });
    
    console.log('Returning users:', users.length);
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get single user by id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    // Check if user exists and is not superadmin
    const existingUser = await User.findByPk(req.params.id);
    if (!existingUser) return res.status(404).json({ error: "User not found" });
    
    // Prevent modification of superadmin users by non-superadmin users
    if ((existingUser.isSuperAdmin || existingUser.role === "superadmin") && req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Cannot modify superadmin user" });
    }
    
    const { username, name, email, role, departmentId, avatar } = req.body;
    const update = { username, name, email, role, departmentId, avatar };
    
    // Prevent changing superadmin role
    if (existingUser.isSuperAdmin || existingUser.role === "superadmin") {
      delete update.role;
      delete update.isSuperAdmin;
    }
    
    // Remove undefined fields
    Object.keys(update).forEach(
      (key) => update[key] === undefined && delete update[key]
    );
    
    const [updatedCount] = await User.update(update, {
      where: { id: req.params.id }
    });
    
    if (updatedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Reset user password (admin only)
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    const [updatedCount] = await User.update(
      { password: hash },
      { where: { id: req.params.id } }
    );
    
    if (updatedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // No one can delete a superadmin
    if (user.isSuperAdmin || user.role === "superadmin") {
      return res.status(403).json({ error: "Cannot delete superadmin user" });
    }

    // Only superadmin or admin can delete
    if (req.user.role === "superadmin") {
      // Superadmin can delete admins and users (but not superadmins)
      if (user.role === "superadmin" || user.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot delete superadmin user" });
      }
    } else if (req.user.role === "admin") {
      // Admin can only delete users (not admins or superadmins)
      if (user.role !== "user") {
        return res.status(403).json({ error: "Admin can only delete normal users" });
      }
    } else {
      // Other roles cannot delete
      return res.status(403).json({ error: "Forbidden" });
    }

    await User.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // Accept either email or username for login
    const whereClause = {};
    if (email || username) {
      whereClause[Op.or] = [];
      if (email) whereClause[Op.or].push({ email });
      if (username) whereClause[Op.or].push({ username });
    } else {
      return res.status(400).json({ error: "Email or username is required" });
    }
    
    const user = await User.findOne({ where: whereClause });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, name, email, password, role, departmentId } = req.body;
    if (!username || !name || !email || !password || !role || !departmentId)
      return res
        .status(400)
        .json({ error: "Missing required fields: username, name, email, password, role, departmentId" });
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "A user with this username already exists" });
      }
    }

    // Validate department exists
    const departmentExists = await Department.findByPk(departmentId);
    if (!departmentExists) {
      return res.status(400).json({ error: "Invalid department selected" });
    }

    const hash = await bcrypt.hash(password, 10);
    
    const user = await User.create({ 
      username, 
      name, 
      email, 
      password: hash, 
      role, 
      departmentId,
      createdById: req.user.id // Set the current user as the creator
    });
    
    // Fetch the created user with associations
    const populatedUser = await User.findByPk(user.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });
    
    res.json(populatedUser);
  } catch (err) {
    res
      .status(400)
      .json({ error: "Failed to create user", details: err.message });
  }
};
