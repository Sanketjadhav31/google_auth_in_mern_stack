const Project = require('../models/Project');

module.exports = async function isProjectAdmin(req, res, next) {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const isAdmin = project.teamMembers.some(
      m => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ message: 'Admin access only' });
    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
} 
 
 
 