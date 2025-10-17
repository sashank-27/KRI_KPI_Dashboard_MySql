const express = require("express");
const { login, createUser, getAllUsers, getUserById, updateUser, deleteUser, resetUserPassword, getCurrentUser, updateCurrentUser, changeCurrentUserPassword, getSystemHealth } = require("../controllers/userController");
const { authMiddleware, adminMiddleware } = require("../middleware");

const router = express.Router();

router.post("/login", login);
router.get("/health", getSystemHealth);
router.get("/me", authMiddleware, getCurrentUser);
router.put("/me", authMiddleware, updateCurrentUser);
router.put("/me/change-password", authMiddleware, changeCurrentUserPassword);
router.post("/users", authMiddleware, adminMiddleware, createUser);
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/:id", authMiddleware, adminMiddleware, getUserById);
router.put("/users/:id", authMiddleware, adminMiddleware, updateUser);
router.put("/users/:id/reset-password", authMiddleware, adminMiddleware, resetUserPassword);
router.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);

module.exports = router;
