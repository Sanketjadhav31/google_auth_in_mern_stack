const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../public/uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Get all tasks for a project
router.get('/project/:projectId', isAuthenticated, async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignedTo', 'displayName image')
            .populate('createdBy', 'displayName image')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

// Get user's tasks
router.get('/my-tasks', isAuthenticated, async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user._id })
            .populate('project', 'title')
            .populate('createdBy', 'displayName image')
            .sort({ dueDate: 1 });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

// Get dashboard statistics
router.get('/stats', isAuthenticated, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get total tasks
        const totalTasks = await Task.countDocuments({
            $or: [
                { assignedTo: req.user._id },
                { createdBy: req.user._id }
            ]
        });

        // Get overdue tasks
        const overdueTasks = await Task.countDocuments({
            assignedTo: req.user._id,
            dueDate: { $lt: today },
            status: { $ne: 'completed' }
        });

        // Get tasks due today
        const todayTasks = await Task.countDocuments({
            assignedTo: req.user._id,
            dueDate: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            status: { $ne: 'completed' }
        });

        // Get completed tasks
        const completedTasks = await Task.countDocuments({
            assignedTo: req.user._id,
            status: 'completed'
        });

        res.json({
            totalTasks,
            overdueTasks,
            todayTasks,
            completedTasks
        });
    } catch (error) {
        console.error('Error fetching task statistics:', error);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

// Create a new task (project admin or global admin only)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { title, description, project, assignedTo, dueDate, priority } = req.body;
        // Check project admin or global admin
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const isProjectAdmin = projectDoc.teamMembers.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');
        if (!(isProjectAdmin || req.user.role === 'admin' || projectDoc.owner.equals(req.user._id))) {
            return res.status(403).json({ message: 'Only project admins or global admins can create tasks' });
        }
        const task = new Task({
            title,
            description,
            project,
            assignedTo,
            createdBy: req.user._id,
            dueDate,
            priority
        });
        await task.save();
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'displayName image')
            .populate('createdBy', 'displayName image')
            .populate('project', 'title');
        res.status(201).json(populatedTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Error creating task' });
    }
});

// Update task status
router.patch('/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.status = status;
        await task.save();

        const updatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'displayName image')
            .populate('createdBy', 'displayName image')
            .populate('project', 'title');

        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
});

// Toggle task bookmark
router.patch('/:id/bookmark', isAuthenticated, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.bookmarked = !task.bookmarked;
        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'displayName image')
            .populate('createdBy', 'displayName image')
            .populate('project', 'title');

        res.json(populatedTask);
    } catch (error) {
        console.error('Error toggling task bookmark:', error);
        res.status(500).json({ message: 'Error toggling task bookmark' });
    }
});

// Delete task
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (!task.createdBy.equals(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        await task.deleteOne();
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
});

// Add reminder to task
router.post('/:id/reminders', isAuthenticated, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const { time, type } = req.body;
        task.reminders.push({ time, type });
        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'displayName image')
            .populate('createdBy', 'displayName image')
            .populate('project', 'title');

        res.json(populatedTask);
    } catch (error) {
        console.error('Error adding reminder:', error);
        res.status(500).json({ message: 'Error adding reminder' });
    }
});

// Remove reminder from task
router.delete('/:id/reminders/:reminderId', isAuthenticated, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.reminders = task.reminders.filter(r => r._id.toString() !== req.params.reminderId);
        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'displayName image')
            .populate('createdBy', 'displayName image')
            .populate('project', 'title');

        res.json(populatedTask);
    } catch (error) {
        console.error('Error removing reminder:', error);
        res.status(500).json({ message: 'Error removing reminder' });
    }
});

// Get task suggestions
router.get('/suggestions', isAuthenticated, async (req, res) => {
    try {
        const userTasks = await Task.find({ assignedTo: req.user._id })
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(10);

        // Get tasks with similar titles or descriptions
        const recentTaskTitles = userTasks.map(task => task.title);
        const recentTaskDescriptions = userTasks.map(task => task.description);

        const suggestions = await Task.find({
            _id: { $nin: userTasks.map(task => task._id) },
            $or: [
                { title: { $regex: recentTaskTitles.join('|'), $options: 'i' } },
                { description: { $regex: recentTaskDescriptions.join('|'), $options: 'i' } }
            ]
        })
        .populate('assignedTo', 'displayName image')
        .populate('createdBy', 'displayName image')
        .populate('project', 'title')
        .limit(5);

        res.json(suggestions);
    } catch (error) {
        console.error('Error fetching task suggestions:', error);
        res.status(500).json({ message: 'Error fetching task suggestions' });
    }
});

// Upload attachment to a task
router.post('/:id/attachments', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const attachment = {
            filename: file.originalname,
            url: `/uploads/${file.filename}`
        };
        task.attachments.push(attachment);
        await task.save();
        res.json(task);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ message: 'Error uploading attachment' });
    }
});

// Mark recurring task as completed and create next occurrence
router.patch('/:id/complete', isAuthenticated, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        task.status = 'completed';
        await task.save();
        // If recurring, create next occurrence
        if (task.recurrence && task.recurrence.type !== 'none') {
            let nextDueDate = new Date(task.dueDate);
            if (task.recurrence.type === 'daily') {
                nextDueDate.setDate(nextDueDate.getDate() + task.recurrence.interval);
            } else if (task.recurrence.type === 'weekly') {
                nextDueDate.setDate(nextDueDate.getDate() + 7 * task.recurrence.interval);
            } else if (task.recurrence.type === 'monthly') {
                nextDueDate.setMonth(nextDueDate.getMonth() + task.recurrence.interval);
            }
            if (!task.recurrence.endDate || nextDueDate <= task.recurrence.endDate) {
                const newTask = new Task({
                    ...task.toObject(),
                    _id: undefined,
                    status: 'todo',
                    dueDate: nextDueDate
                });
                await newTask.save();
            }
        }
        res.json(task);
    } catch (error) {
        console.error('Error completing recurring task:', error);
        res.status(500).json({ message: 'Error completing recurring task' });
    }
});

module.exports = router; 