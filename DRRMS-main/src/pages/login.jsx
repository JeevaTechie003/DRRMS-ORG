import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("citizen");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Reset error state

    if (!email || !password || !role) {
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true); // Set loading state to true

    try {
      // Adjusted URL based on your backend API
      const response = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
        credentials: "include", 
      });

      const data = await response.json();

      if (!response.ok) {
        
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token || "dummy-token");

      
      const routes = {
        volunteer: "/volunteer",
        admin: "/admin",
        citizen: "/citizen",
      };
      navigate(routes[role] || "/");

    } catch (err) {
      // Handle errors
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false); 
    }
  };

  return (
  
    <div className="login-container">
      <div className="login-image-section">
        <div className="welcome-text">
          <h1>Disaster Relief Resource Management</h1>
          <p>Helping you connect with relief during crisis</p>
        </div>
      </div>

      <div className="login-form-section">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Login</h2>

        
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}


          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="citizen">Citizen</option>
            <option value="volunteer">Volunteer</option>
            <option value="admin">Admin</option>
          </select>

     
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <p className="link-text">
            New user? <a href="/register">Register here</a>
          </p>
        </form>
      </div>
    </div>
    
  );
}

export default Login;
