const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const { isAuthenticated } = require("../middleware/auth");
const isProjectAdmin = require("../middleware/isProjectAdmin");

// Get all projects for the authenticated user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { teamMembers: req.user._id }
      ]
    })
    .populate("owner", "displayName image")
    .populate("teamMembers", "displayName image")
    .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// Create a new project (admin only)
router.post("/", isAuthenticated, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create projects' });
  }
  try {
    const { title, description, teamMembers } = req.body;
    const project = new Project({
      title,
      description,
      owner: req.user._id,
      teamMembers: teamMembers || []
    });
    await project.save();
    const populatedProject = await Project.findById(project._id)
      .populate("owner", "displayName image")
      .populate("teamMembers", "displayName image");
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Error creating project" });
  }
});

// Update a project
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const { title, description, teamMembers, status } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is owner or team member
    if (!project.owner.equals(req.user._id) && !project.teamMembers.includes(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to update this project" });
    }

    project.title = title || project.title;
    project.description = description || project.description;
    project.teamMembers = teamMembers || project.teamMembers;
    project.status = status || project.status;

    await project.save();
    
    const updatedProject = await Project.findById(project._id)
      .populate("owner", "displayName image")
      .populate("teamMembers", "displayName image");

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Error updating project" });
  }
});

// Delete a project
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only owner can delete the project
    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to delete this project" });
    }

    await project.deleteOne();
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Error deleting project" });
  }
});

// Invite member
router.post('/:id/invite', isAuthenticated, isProjectAdmin, async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Check if already a member
    if (req.project.teamMembers.some(m => m.user.toString() === user._id.toString())) {
      return res.status(400).json({ message: 'User already a team member' });
    }
    req.project.teamMembers.push({ user: user._id, role: role || 'member' });
    await req.project.save();
    // Emit socket event
    req.app.get('io').to(`project_${req.project._id}`).emit('member:added', { user, role: role || 'member' });
    res.json({ message: 'Member invited', user, role: role || 'member' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to invite member' });
  }
});

// Remove member
router.delete('/:id/member/:userId', isAuthenticated, isProjectAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    req.project.teamMembers = req.project.teamMembers.filter(m => m.user.toString() !== userId);
    await req.project.save();
    req.app.get('io').to(`project_${req.project._id}`).emit('member:removed', { userId });
    res.json({ message: 'Member removed', userId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// Change role
router.put('/:id/member/:userId/role', isAuthenticated, isProjectAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const member = req.project.teamMembers.find(m => m.user.toString() === userId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    member.role = role;
    await req.project.save();
    req.app.get('io').to(`project_${req.project._id}`).emit('member:role-updated', { userId, role });
    res.json({ message: 'Role updated', userId, role });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// Get team
router.get('/:id/team', isAuthenticated, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('teamMembers.user', 'displayName email image role');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project.teamMembers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get team' });
  }
});

// Allow user to change their own role (admin <-> user)
router.patch('/change-role', isAuthenticated, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    req.user.role = role;
    await req.user.save();
    res.json({ message: 'Role updated', role });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update role' });
  }
});

module.exports = router; 