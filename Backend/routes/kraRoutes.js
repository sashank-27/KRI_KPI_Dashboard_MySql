const express = require("express");
const router = express.Router();
const {
  getAllKRAs,
  getKRAById,
  getKRAsByUser,
  createKRA,
  updateKRA,
  deleteKRA,
  updateKRAStatus,
} = require("../controllers/kraController");
const { authMiddleware } = require("../middleware");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/kras - Get all KRAs
router.get("/", getAllKRAs);

// GET /api/kras/:id - Get KRA by ID
router.get("/:id", getKRAById);

// GET /api/kras/user/:userId - Get KRAs by assigned user
router.get("/user/:userId", getKRAsByUser);

// POST /api/kras - Create new KRA
router.post("/", createKRA);

// PUT /api/kras/:id - Update KRA
router.put("/:id", updateKRA);

// PATCH /api/kras/:id/status - Update KRA status
router.patch("/:id/status", updateKRAStatus);

// DELETE /api/kras/:id - Delete KRA
router.delete("/:id", deleteKRA);

module.exports = router;
