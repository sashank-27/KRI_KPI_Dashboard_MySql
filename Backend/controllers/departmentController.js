const Department = require("../models/Department");
const { Op } = require("sequelize");

// Create a new department
exports.createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }
    
    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: "Department already exists" });
    }
    
    const department = await Department.create({ name });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all departments
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(departments);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }
    
    const [updatedCount] = await Department.update(
      { name },
      { 
        where: { id },
        returning: true
      }
    );
    
    if (updatedCount === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    
    const department = await Department.findByPk(id);
    res.status(200).json(department);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete department
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCount = await Department.destroy({ where: { id } });
    
    if (deletedCount === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    
    res.status(200).json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
