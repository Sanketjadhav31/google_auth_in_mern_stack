const express = require("express");
const router = express.Router();
const passport = require("passport");
const { isAuthenticated } = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const User = require("../models/User");
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const multer = require('multer');
const path = require('path');

// Google OAuth routes
router.get("/google", passport.authenticate("google", { 
	scope: ["profile", "email"],
	prompt: "select_account"
}));

router.get(
	"/google/callback",
	(req, res, next) => {
		passport.authenticate("google", {
			failureRedirect: "http://localhost:3000/login",
			session: true  // Enable session
		}, (err, user, info) => {
			if (err) {
				console.error("Google authentication error:", err);
				return res.redirect(`http://localhost:3000/login?error=${encodeURIComponent(err.message)}`);
			}
			if (!user) {
				console.error("No user returned from Google authentication");
				return res.redirect("http://localhost:3000/login?error=Authentication failed");
			}
			req.user = user;
			next();
		})(req, res, next);
	},
	async (req, res) => {
		try {
			console.log("Generating token for user:", req.user.email);
			// Generate JWT token
			const token = await req.user.generateAuthToken();
			console.log('User tokens after save:', req.user.tokens); // Log tokens after save
			
			const userData = {
				_id: req.user._id,
				email: req.user.email,
				displayName: req.user.displayName,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				image: req.user.image
			};
			const redirectUrl = `http://localhost:3000/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
			return res.redirect(redirectUrl);
		} catch (error) {
			console.error("Google callback error:", error);
			res.redirect(`http://localhost:3000/login?error=${encodeURIComponent(error.message)}`);
		}
	}
);

// Check authentication status
router.get("/login/success", async (req, res) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		console.log('Checking token:', token); // Log token
		if (!token) {
			console.error("No token provided in login/success");
			return res.status(401).json({
				success: false,
				message: "No token provided"
			});
		}

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			console.log("Token decoded successfully for user:", decoded._id);
			const user = await User.findOne({ 
				_id: decoded._id,
				'tokens.token': token 
			});
			console.log('User found:', user); // Log user
			if (!user) {
				console.error("User not found or token invalid for ID:", decoded._id);
				return res.status(401).json({
					success: false,
					message: "User not found or token invalid"
				});
			}

			console.log("User authenticated successfully:", user.email);
			// Return user data without sensitive information
			const userData = {
				_id: user._id,
				email: user.email,
				displayName: user.displayName,
				firstName: user.firstName,
				lastName: user.lastName,
				image: user.image
			};

			return res.status(200).json({
				success: true,
				message: "Successfully authenticated",
				user: userData
			});
		} catch (jwtError) {
			console.error("JWT verification error:", jwtError);
			return res.status(401).json({
				success: false,
				message: "Invalid token"
			});
		}
	} catch (error) {
		console.error("Auth check error:", error);
		return res.status(401).json({
			success: false,
			message: "Authentication failed"
		});
	}
});

// Local registration
router.post("/register", async (req, res) => {
	try {
		const { username, email, password } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User already exists"
			});
		}

		// Create new user
		const user = await User.create({
			email,
			password,
			displayName: username,
			firstName: username,
			lastName: username
		});

		// Generate token
		const token = await user.generateAuthToken();

		res.status(201).json({
			success: true,
			message: "Registration successful",
			user,
			token
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({
			success: false,
			message: error.message || "Error during registration"
		});
	}
});

// Local login
router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findByCredentials(email, password);
		const token = await user.generateAuthToken();

		res.json({
			success: true,
			message: "Login successful",
			user,
			token
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(401).json({
			success: false,
			message: "Invalid login credentials"
		});
	}
});

// Logout
router.post("/logout", async (req, res) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			const user = await User.findById(decoded._id);
			
			if (user) {
				// Remove the current token from user's tokens array
				user.tokens = user.tokens.filter(t => t.token !== token);
				await user.save();
			}
		}
		
		res.status(200).json({ 
			success: true,
			message: "Successfully logged out" 
		});
	} catch (error) {
		console.error("Logout error:", error);
		res.status(500).json({ 
			success: false,
			message: "Error logging out" 
		});
	}
});

// Example admin-only route
router.get('/admin/test', isAuthenticated, isAdmin, (req, res) => {
	res.json({ message: 'You are an admin!' });
});

// Admin: Get all users
router.get('/admin/users', isAuthenticated, isAdmin, async (req, res) => {
	try {
		const users = await User.find({}, '-password -tokens');
		res.json(users);
	} catch (err) {
		res.status(500).json({ message: 'Failed to fetch users' });
	}
});

// Admin: Delete user
router.delete('/admin/user/:id', isAuthenticated, isAdmin, async (req, res) => {
	try {
		await User.findByIdAndDelete(req.params.id);
		res.json({ message: 'User deleted' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to delete user' });
	}
});

// Admin: Get all tasks
router.get('/admin/tasks', isAuthenticated, isAdmin, async (req, res) => {
	try {
		const tasks = await Task.find().populate('assignedTo', 'displayName email').populate('createdBy', 'displayName email');
		res.json(tasks);
	} catch (err) {
		res.status(500).json({ message: 'Failed to fetch tasks' });
	}
});

// Admin: Delete task
router.delete('/admin/task/:id', isAuthenticated, isAdmin, async (req, res) => {
	try {
		await Task.findByIdAndDelete(req.params.id);
		res.json({ message: 'Task deleted' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to delete task' });
	}
});

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, '../../public/uploads'));
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '-' + file.originalname);
	}
});
const upload = multer({ storage });

// Update user profile (name, bio, photo)
router.put('/profile', isAuthenticated, upload.single('photo'), async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		if (req.body.name) user.displayName = req.body.name;
		if (req.body.bio) user.bio = req.body.bio;
		if (req.file) user.image = `/uploads/${req.file.filename}`;
		await user.save();
		res.json({
			name: user.displayName,
			bio: user.bio,
			photo: user.image
		});
	} catch (error) {
		res.status(500).json({ message: 'Failed to update profile' });
	}
});

// Change user role
router.patch('/role', isAuthenticated, async (req, res) => {
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

// Change password
router.post('/change-password', isAuthenticated, async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
		user.password = newPassword;
		await user.save();
		res.json({ message: 'Password changed successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Failed to change password' });
	}
});

module.exports = router;
