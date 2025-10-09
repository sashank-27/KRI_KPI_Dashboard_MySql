const { Op } = require("sequelize");
const KRA = require("../models/KRA");
const User = require("../models/User");
const Department = require("../models/Department");

// Get all KRAs
const getAllKRAs = async (req, res) => {
  try {
    const kras = await KRA.findAll({
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(kras);
  } catch (error) {
    console.error("Error fetching KRAs:", error);
    res.status(500).json({ error: "Failed to fetch KRAs" });
  }
};

// Get KRA by ID
const getKRAById = async (req, res) => {
  try {
    const kra = await KRA.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!kra) {
      return res.status(404).json({ error: "KRA not found" });
    }

    res.json(kra);
  } catch (error) {
    console.error("Error fetching KRA:", error);
    res.status(500).json({ error: "Failed to fetch KRA" });
  }
};

// Get KRAs by assigned user
const getKRAsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Fetching KRAs for user ID:", userId);
    
    // Validate user ID
    if (!userId || isNaN(parseInt(userId))) {
      console.error("Invalid user ID format:", userId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    
    const kras = await KRA.findAll({
      where: { assignedToId: userId },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log("Found KRAs:", kras.length);
    res.json(kras);
  } catch (error) {
    console.error("Error fetching user KRAs:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch user KRAs", details: error.message });
  }
};

// Create new KRA
const createKRA = async (req, res) => {
  try {
    const {
      responsibilityAreas,
      departmentId,
      assignedToId,
      startDate,
      endDate,
    } = req.body;

    // Validate required fields
    if (!responsibilityAreas || !departmentId || !assignedToId || !startDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate that assignedTo user exists
    const user = await User.findByPk(assignedToId);
    if (!user) {
      return res.status(400).json({ error: "Assigned user not found" });
    }

    // Validate that department exists
    const dept = await Department.findByPk(departmentId);
    if (!dept) {
      return res.status(400).json({ error: "Department not found" });
    }

    // Process responsibility areas
    const processedAreas = Array.isArray(responsibilityAreas) 
      ? responsibilityAreas 
      : responsibilityAreas.split('\n').filter(area => area.trim());

    // Create new KRA
    const newKRA = await KRA.create({
      responsibilityAreas: processedAreas,
      departmentId,
      assignedToId,
      startDate,
      endDate: endDate || null,
      createdById: req.user.id, // Assuming user ID is available in req.user
    });

    // Fetch the created KRA with associations
    const populatedKRA = await KRA.findByPk(newKRA.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit websocket event to all admins and the assigned user
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('kra-created', populatedKRA);
      io.to(`user-${assignedToId}`).emit('kra-created', populatedKRA);
    }

    res.status(201).json(populatedKRA);
  } catch (error) {
    console.error("Error creating KRA:", error);
    res.status(500).json({ error: "Failed to create KRA", details: error.message });
  }
};

// Update KRA
const updateKRA = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert responsibility areas if it's a string
    if (updateData.responsibilityAreas && typeof updateData.responsibilityAreas === 'string') {
      updateData.responsibilityAreas = updateData.responsibilityAreas
        .split('\n')
        .filter(area => area.trim());
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const [updatedCount] = await KRA.update(updateData, {
      where: { id },
      returning: true
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: "KRA not found" });
    }

    const updatedKRA = await KRA.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit websocket event to all admins and the assigned user
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('kra-updated', updatedKRA);
      io.to(`user-${updatedKRA.assignedToId}`).emit('kra-updated', updatedKRA);
    }

    res.json(updatedKRA);
  } catch (error) {
    console.error("Error updating KRA:", error);
    res.status(500).json({ error: "Failed to update KRA" });
  }
};

// Delete KRA
const deleteKRA = async (req, res) => {
  try {
    const { id } = req.params;

    const kraToDelete = await KRA.findByPk(id);

    if (!kraToDelete) {
      return res.status(404).json({ error: "KRA not found" });
    }

    const assignedToId = kraToDelete.assignedToId;

    await KRA.destroy({ where: { id } });

    // Emit websocket event to all admins and the assigned user
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('kra-deleted', { id });
      io.to(`user-${assignedToId}`).emit('kra-deleted', { id });
    }

    res.json({ message: "KRA deleted successfully" });
  } catch (error) {
    console.error("Error deleting KRA:", error);
    res.status(500).json({ error: "Failed to delete KRA" });
  }
};

// Update KRA status
const updateKRAStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "completed", "cancelled", "on-hold"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updatedCount] = await KRA.update(
      { status },
      { where: { id } }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ error: "KRA not found" });
    }

    const updatedKRA = await KRA.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedKRA);
  } catch (error) {
    console.error("Error updating KRA status:", error);
    res.status(500).json({ error: "Failed to update KRA status" });
  }
};

module.exports = {
  getAllKRAs,
  getKRAById,
  getKRAsByUser,
  createKRA,
  updateKRA,
  deleteKRA,
  updateKRAStatus,
};
