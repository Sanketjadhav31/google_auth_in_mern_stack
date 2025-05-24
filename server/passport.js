const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");
const User = require("./models/User");

module.exports = function (passport) {
	passport.use(
		new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				callbackURL: "/auth/google/callback",
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					console.log("Google profile received:", {
						id: profile.id,
						email: profile.emails?.[0]?.value,
						name: profile.displayName
					});

					// Check if user already exists
					let user = await User.findOne({ 
						$or: [
							{ googleId: profile.id },
							{ email: profile.emails?.[0]?.value }
						]
					});
					
					if (user) {
						// Update Google ID if not set
						if (!user.googleId) {
							user.googleId = profile.id;
							await user.save();
						}
						console.log("Existing user found:", user.email);
						return done(null, user);
					}
					
					// Validate required fields
					if (!profile.emails?.[0]?.value) {
						console.error("No email provided by Google");
						return done(new Error("No email provided by Google"), null);
					}

					// Create new user
					user = await User.create({
						googleId: profile.id,
						email: profile.emails[0].value,
						displayName: profile.displayName || profile.emails[0].value.split('@')[0],
						firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || profile.emails[0].value.split('@')[0],
						lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
						image: profile.photos?.[0]?.value,
						role: 'user'
					});
					
					console.log("New user created:", user.email);
					return done(null, user);
				} catch (error) {
					console.error("Error in Google Strategy:", error);
					return done(error, null);
				}
			}
		)
	);

	passport.serializeUser((user, done) => {
		console.log("Serializing user:", user.email);
		done(null, user._id);
	});

	passport.deserializeUser(async (id, done) => {
		try {
			const user = await User.findById(id);
			if (!user) {
				console.error("User not found during deserialization:", id);
				return done(null, false);
			}
			console.log("Deserializing user:", user.email);
			done(null, user);
		} catch (error) {
			console.error("Error deserializing user:", error);
			done(error, null);
		}
	});
};
