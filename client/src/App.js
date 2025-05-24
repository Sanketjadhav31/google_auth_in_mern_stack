import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

// Import pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Landing from './pages/Landing';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import OAuthCallback from "./pages/OAuthCallback";

function App() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const verifyToken = async (token) => {
		try {
			const response = await axios.get("http://localhost:5000/auth/login/success", {
				headers: {
					'Authorization': `Bearer ${token}`
				},
				withCredentials: true
			});

			if (response.data && response.data.success && response.data.user) {
				setUser(response.data.user);
				localStorage.setItem('user', JSON.stringify(response.data.user));
				return true;
			}
			return false;
		} catch (error) {
			console.error("Token verification error:", error);
			return false;
		}
	};

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const token = localStorage.getItem('token');
				const storedUser = localStorage.getItem('user');
				
				if (!token) {
					setUser(null);
					setLoading(false);
					return;
				}

				// First try to use stored user data
				if (storedUser) {
					try {
						const parsedUser = JSON.parse(storedUser);
						setUser(parsedUser);
					} catch (e) {
						console.error("Error parsing stored user:", e);
					}
				}

				// Then verify token
				const isValid = await verifyToken(token);
				if (!isValid) {
					setUser(null);
					localStorage.removeItem('token');
					localStorage.removeItem('user');
				}
			} catch (error) {
				console.error("Auth check error:", error);
				setUser(null);
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				if (error.response?.status !== 401) {
					setError(error.response?.data?.message || "Authentication failed");
				}
			} finally {
				setLoading(false);
			}
		};

		checkAuth();

		// Add event listener for storage changes
		const handleStorageChange = (e) => {
			if (e.key === 'token' || e.key === 'user') {
				if (e.key === 'token' && e.newValue) {
					verifyToken(e.newValue);
				} else if (e.key === 'user' && e.newValue) {
					try {
						setUser(JSON.parse(e.newValue));
					} catch (e) {
						console.error("Error parsing user data:", e);
					}
				} else {
					setUser(null);
				}
			}
		};

		window.addEventListener('storage', handleStorageChange);
		return () => window.removeEventListener('storage', handleStorageChange);
	}, []);

	const handleLogout = async () => {
		try {
			const token = localStorage.getItem('token');
			if (token) {
				await axios.post("http://localhost:5000/auth/logout", {}, {
					headers: {
						'Authorization': `Bearer ${token}`
					},
					withCredentials: true
				});
			}
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			setUser(null);
		}
	};

	if (loading) {
		return (
			<div className="loading">
				<div className="spinner"></div>
				<p>Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="error-container">
				<p className="error-message">{error}</p>
				<button onClick={() => window.location.reload()}>Retry</button>
			</div>
		);
	}

	return (
		<Routes>
			<Route
				path="/login"
				element={user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />}
			/>
			<Route
				path="/register"
				element={user ? <Navigate to="/dashboard" replace /> : <Register setUser={setUser} />}
			/>
			<Route
				path="/dashboard"
				element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
			/>
			<Route
				path="/team"
				element={user ? <Team user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
			/>
			<Route
				path="/projects"
				element={user ? <Projects user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
			/>
			<Route
				path="/tasks"
				element={user ? <Tasks user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
			/>
			<Route
				path="/"
				element={user ? <Navigate to="/dashboard" replace /> : <Landing />}
			/>
			<Route
				path="/admin"
				element={user && user.role === 'admin' ? <AdminPanel user={user} /> : <Navigate to="/dashboard" replace />}
			/>
			<Route
				path="/profile"
				element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" replace />}
			/>
			<Route path="/oauth-callback" element={<OAuthCallback setUser={setUser} />} />
		</Routes>
	);
}

export default App;

