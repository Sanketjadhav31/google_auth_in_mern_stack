import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import "../styles/Register.css";

function Register({ setUser }) {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: ""
	});
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		// Validate form data
		if (!formData.username || !formData.email || !formData.password) {
			setError("All fields are required");
			setLoading(false);
			return;
		}

		if (formData.password.length < 6) {
			setError("Password must be at least 6 characters long");
			setLoading(false);
			return;
		}

		try {
			const response = await axios.post("http://localhost:5000/auth/register", formData, {
				headers: {
					'Content-Type': 'application/json'
				}
			});
			
			if (response.data && response.data.success && response.data.token) {
				localStorage.setItem('token', response.data.token);
				setUser(response.data.user);
				navigate("/dashboard", { replace: true });
			} else {
				setError("Registration failed. Please try again.");
			}
		} catch (error) {
			console.error("Signup error:", error.response?.data || error.message);
			setError(error.response?.data?.message || "Registration failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const googleAuth = () => {
		window.location.href = "http://localhost:5000/auth/google";
	};

	return (
		<div className="container">
			<h1 className="heading">Sign up Form</h1>
			<div className="form_container">
				<div className="left">
					<img className="img" src="./images/signup.jpg" alt="signup" />
				</div>
				<div className="right">
					<h2 className="from_heading">Create Account</h2>
					{error && <div className="error">{error}</div>}
					<input 
						type="text" 
						className="input" 
						placeholder="Username" 
						name="username" 
						value={formData.username} 
						onChange={handleChange}
						disabled={loading}
					/>
					<input 
						type="email" 
						className="input" 
						placeholder="Email" 
						name="email" 
						value={formData.email} 
						onChange={handleChange}
						disabled={loading}
					/>
					<input 
						type="password" 
						className="input" 
						placeholder="Password" 
						name="password" 
						value={formData.password} 
						onChange={handleChange}
						disabled={loading}
					/>
					<button className="btn" onClick={handleSubmit} disabled={loading}>
						{loading ? "Signing up..." : "Sign Up"}
					</button>
					<p className="text">or</p>
					<button className="google_btn" onClick={googleAuth} disabled={loading}>
						<img src="./images/google.png" alt="google icon" />
						<span>Sign up with Google</span>
					</button>
					<p className="text">
						Already Have Account ? <Link to="/login">Log In</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default Register;
