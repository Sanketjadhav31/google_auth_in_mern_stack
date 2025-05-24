require("dotenv").config({ path: './.env' });
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passportStrategy = require("./passport");
const connectDB = require("./config/db");
const authRoute = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const teamRoutes = require("./routes/team");
const path = require('path');
const fs = require('fs');
const { createServer } = require("http");
const { Server } = require("socket.io");

// Debug: Check if .env file exists
const envPath = path.resolve(__dirname, '.env');
console.log('Looking for .env file at:', envPath);
if (fs.existsSync(envPath)) {
	console.log('.env file exists');
	console.log('File contents:', fs.readFileSync(envPath, 'utf8'));
} else {
	console.error('.env file does not exist at:', envPath);
}

// Validate environment variables
const requiredEnvVars = ['MONGO_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
	console.error('Missing required environment variables:', missingEnvVars.join(', '));
	console.error('Please check your .env file in:', envPath);
	process.exit(1);
}

// Connect to MongoDB
connectDB();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT || 5000);
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Present' : 'Missing');
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Present' : 'Missing');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST"],
		credentials: true
	}
});

// Socket.IO connection handling
io.on('connection', (socket) => {
	console.log('A user connected');
	
	socket.on('disconnect', () => {
		console.log('User disconnected');
	});
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
	res.setHeader(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
	);
	next();
});

// CORS configuration
app.use(
	cors({
		origin: "http://localhost:3000",
		methods: "GET,POST,PUT,DELETE",
		credentials: true,
		allowedHeaders: ['Content-Type', 'Authorization'],
		exposedHeaders: ['Authorization']
	})
);

// Session configuration
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: true,
		saveUninitialized: true,
		store: MongoStore.create({
			mongoUrl: process.env.MONGO_URI,
			ttl: 24 * 60 * 60, // 1 day
			autoRemove: 'native',
			touchAfter: 24 * 3600, // time period in seconds
			crypto: {
				secret: process.env.SESSION_SECRET,
				algorithm: 'aes-256-gcm',
				hashing: 'sha256'
			}
		}),
		cookie: {
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
			sameSite: "lax",
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true
		}
	})
);

// Initialize Passport
passportStrategy(passport);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware
app.use((req, res, next) => {
	console.log("Session:", req.session);
	console.log("User:", req.user);
	next();
});

// Routes
app.use("/auth", authRoute);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/team", teamRoutes);

// Test route
app.get("/", (req, res) => {
	res.send("Server is running");
});

const port = process.env.PORT || 5000;
httpServer.listen(port, () => {
	console.log(`Server is running on port ${port}`);
	console.log("MongoDB connected");
});
