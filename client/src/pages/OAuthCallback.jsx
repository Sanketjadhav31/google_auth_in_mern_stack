import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function OAuthCallback({ setUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const user = params.get("user");
    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", user);
      if (setUser) setUser(JSON.parse(user));
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login?error=OAuth+failed", { replace: true });
    }
  }, [location, navigate, setUser]);

  return <div>Completing sign in...</div>;
}

export default OAuthCallback; 