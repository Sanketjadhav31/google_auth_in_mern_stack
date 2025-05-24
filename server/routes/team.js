const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const { isAuthenticated } = require("../middleware/auth");
const mongoose = require('mongoose');

// Get all team members
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const team = await Team.find().sort({ createdAt: -1 });
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Error fetching team members" });
  }
});

// Add a new team member
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { name, email, role, avatar } = req.body;
    
    // Check if email already exists
    const existingMember = await Team.findOne({ email });
    if (existingMember) {
      return res.status(400).json({ message: "A member with this email already exists" });
    }

    const member = new Team({
      name,
      email,
      role,
      avatar
    });

    await member.save();
    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({ message: "Error adding team member" });
  }
});

// Update team member role
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid team member ID" });
    }

    const member = await Team.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }

    member.role = role;
    await member.save();
    
    // Return updated member
    const updatedMember = await Team.findById(req.params.id);
    res.json(updatedMember);
  } catch (error) {
    console.error("Error updating team member:", error);
    res.status(500).json({ message: "Error updating team member" });
  }
});

// Delete team member
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid team member ID" });
    }

    const member = await Team.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }

    await member.deleteOne();
    res.json({ message: "Team member deleted successfully" });
  } catch (error) {
    console.error("Error deleting team member:", error);
    res.status(500).json({ message: "Error deleting team member" });
  }
});

module.exports = router; 
 
 
 