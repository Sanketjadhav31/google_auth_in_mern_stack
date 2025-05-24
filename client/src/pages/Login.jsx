import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Login.css";

function Login({ setUser }) {
	const navigate = useNavigate();
	const location = useLocation();
	const [formData, setFormData] = useState({
		email: "",
		password: ""
	});
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Check for error state from Google callback
		if (location.state?.error) {
			setError(location.state.error);
		}
	}, [location]);

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

		try {
			const response = await axios.post("http://localhost:5000/auth/login", formData);
			
			if (response.data && response.data.success && response.data.token) {
				localStorage.setItem('token', response.data.token);
				setUser(response.data.user);
				navigate("/dashboard", { replace: true });
			} else {
				setError("Login failed. Please try again.");
			}
		} catch (error) {
			console.error("Login error:", error);
			setError(error.response?.data?.message || "Login failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = () => {
		setLoading(true);
		window.location.href = "http://localhost:5000/auth/google";
	};

	return (
		<div className="container">
			<h1 className="heading">Login Form</h1>
			<div className="form_container">
				<div className="left">
					<img className="img" src="./images/login.jpg" alt="login" />
				</div>
				<div className="right">
					<h2 className="from_heading">Login to Your Account</h2>
					{error && <div className="error">{error}</div>}
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
						{loading ? "Logging in..." : "Log In"}
					</button>
					<p className="text">or</p>
					<button className="google_btn" onClick={handleGoogleLogin} disabled={loading}>
						<img src="./images/google.png" alt="google icon" />
						<span>Sign in with Google</span>
					</button>
					<p className="text">
						Don't Have Account ? <Link to="/register">Sign Up</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default Login;
