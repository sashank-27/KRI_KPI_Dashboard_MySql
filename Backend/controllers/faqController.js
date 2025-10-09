const FAQ = require("../models/FAQ");
const DailyTask = require("../models/DailyTask");
const User = require("../models/User");
const Department = require("../models/Department");
const { Op, fn, col } = require("sequelize");
const path = require("path");
const fs = require("fs");

// Get all FAQs (with optional filtering)
exports.getAllFAQs = async (req, res) => {
  try {
    const { srId, search } = req.query;
    const whereClause = { isActive: true };

    if (srId) {
      whereClause.srId = srId;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { problem: { [Op.like]: `%${search}%` } },
        { srId: { [Op.like]: `%${search}%` } },
        // Note: For JSON field search, this might need adjustment based on MySQL version
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }

    const faqs = await FAQ.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'solvedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: DailyTask,
          as: 'task',
          attributes: ['id', 'task']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(faqs);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: "Failed to fetch FAQs", error: error.message });
  }
};

// Get public FAQs (only active ones) - kept for compatibility
exports.getPublicFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'solvedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      attributes: ['id', 'problem', 'srId', 'solutionFile', 'createdAt', 'tags'],
      order: [['createdAt', 'DESC']]
    });

    res.json(faqs);
  } catch (error) {
    console.error("Error fetching public FAQs:", error);
    res.status(500).json({ message: "Failed to fetch FAQs", error: error.message });
  }
};

// Get FAQ by ID
exports.getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'solvedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: DailyTask,
          as: 'task',
          attributes: ['id', 'task', 'remarks']
        }
      ]
    });

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.json(faq);
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({ message: "Failed to fetch FAQ", error: error.message });
  }
};

// Create new FAQ (called when completing a task with SR-ID)
exports.createFAQ = async (req, res) => {
  try {
    console.log("=== FAQ Creation Request ===");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    console.log("User:", req.user);
    
    const { taskId, problem, srId, tags } = req.body;
    const file = req.file;

    // Validate required fields
    if (!taskId || !problem || !srId || !file) {
      console.error("Validation failed:", { taskId: !!taskId, problem: !!problem, srId: !!srId, file: !!file });
      return res.status(400).json({ 
        message: "Task ID, problem description, SR-ID, and solution file are required",
        missing: {
          taskId: !taskId,
          problem: !problem,
          srId: !srId,
          file: !file
        }
      });
    }

    // Verify task exists and has SR-ID
    const task = await DailyTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.srId || task.srId !== srId) {
      return res.status(400).json({ message: "Task SR-ID mismatch" });
    }

    // Prepare solution file data
    const solutionFileData = {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    };

    // Create FAQ entry
    const faq = await FAQ.create({
      problem,
      srId,
      taskId: taskId,
      solutionFile: solutionFileData,
      solvedById: req.user.id, // JWT token uses 'id', not 'userId'
      departmentId: task.departmentId,
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      isActive: true,
    });

    // Update task status to closed
    await DailyTask.update({
      status: "closed",
      closedAt: new Date()
    }, {
      where: { id: taskId }
    });

    // Fetch the created FAQ with associations
    const populatedFAQ = await FAQ.findByPk(faq.id, {
      include: [
        {
          model: User,
          as: 'solvedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: DailyTask,
          as: 'task',
          attributes: ['id', 'task']
        }
      ]
    });

    console.log("✅ FAQ created successfully:", populatedFAQ.id);
    
    res.status(201).json({
      message: "FAQ created and task completed successfully",
      faq: populatedFAQ,
    });
  } catch (error) {
    console.error("❌ Error creating FAQ:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Failed to create FAQ", 
      error: error.message,
      details: error.toString()
    });
  }
};

// Toggle FAQ active status (soft delete)
exports.toggleFAQStatus = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    const newStatus = !faq.isActive;
    await FAQ.update(
      { isActive: newStatus },
      { where: { id: req.params.id } }
    );

    // Get updated FAQ
    const updatedFAQ = await FAQ.findByPk(req.params.id);

    res.json({
      message: `FAQ ${updatedFAQ.isActive ? "activated" : "deactivated"} successfully`,
      faq: updatedFAQ,
    });
  } catch (error) {
    console.error("Error toggling FAQ status:", error);
    res.status(500).json({ message: "Failed to toggle FAQ status", error: error.message });
  }
};

// Download solution file
exports.downloadSolution = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    const filePath = path.resolve(faq.solutionFile.path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Solution file not found" });
    }

    res.download(filePath, faq.solutionFile.originalName);
  } catch (error) {
    console.error("Error downloading solution:", error);
    res.status(500).json({ message: "Failed to download solution", error: error.message });
  }
};

// Get FAQ statistics
exports.getFAQStats = async (req, res) => {
  try {
    const totalFAQs = await FAQ.count({ where: { isActive: true } });
    
    // Get FAQs by department
    const faqsByDepartment = await FAQ.findAll({
      where: { isActive: true },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }],
      attributes: [
        'departmentId',
        [fn('COUNT', col('FAQ.id')), 'count']
      ],
      group: ['departmentId', 'department.id', 'department.name'],
      order: [[fn('COUNT', col('FAQ.id')), 'DESC']]
    });

    // Format the response
    const formattedStats = faqsByDepartment.map(stat => ({
      id: stat.department ? stat.department.name : 'Unknown Department',
      count: parseInt(stat.dataValues.count)
    }));

    res.json({
      totalFAQs,
      faqsByDepartment: formattedStats,
    });
  } catch (error) {
    console.error("Error fetching FAQ stats:", error);
    res.status(500).json({ message: "Failed to fetch FAQ statistics", error: error.message });
  }
};
