import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Landing.css';

function Landing() {
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="logo">
          <h1>CollabEase</h1>
        </div>
        <div className="nav-links">
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className="nav-button">Get Started</Link>
        </div>
      </nav>

      <main className="landing-main">
        <div className="hero-section">
          <h1>Collaborate with Ease</h1>
          <p>Streamline your team's workflow with our powerful collaboration platform</p>
          <Link to="/register" className="cta-button">Start Collaborating</Link>
        </div>

        <div className="features-section">
          <div className="feature-card">
            <h3>Real-time Collaboration</h3>
            <p>Work together seamlessly with real-time updates and instant messaging</p>
          </div>
          <div className="feature-card">
            <h3>Project Management</h3>
            <p>Organize tasks, track progress, and meet deadlines efficiently</p>
          </div>
          <div className="feature-card">
            <h3>Team Communication</h3>
            <p>Stay connected with your team through integrated chat and video calls</p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>CollabEase</h4>
            <p>Making collaboration simple and efficient</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: support@collabease.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 CollabEase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing; 