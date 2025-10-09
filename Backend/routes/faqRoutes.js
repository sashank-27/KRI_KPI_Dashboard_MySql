const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const faqController = require("../controllers/faqController");
const { authMiddleware, adminMiddleware } = require("../middleware");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/faqs/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "faq-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept PDF, images, and common document formats
  const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, documents, and image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File size exceeds 10MB limit' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Public routes (no authentication required)
router.get("/public", faqController.getPublicFAQs);

// Protected routes (authentication required)
router.get("/", authMiddleware, faqController.getAllFAQs);
router.get("/stats", authMiddleware, faqController.getFAQStats);
router.get("/:id/download", authMiddleware, faqController.downloadSolution);
router.get("/:id", authMiddleware, faqController.getFAQById);

// Create FAQ when completing task (user route)
router.post("/", authMiddleware, upload.single("solutionFile"), handleMulterError, faqController.createFAQ);

// Admin only routes
router.patch("/:id/toggle", authMiddleware, adminMiddleware, faqController.toggleFAQStatus);

module.exports = router;
