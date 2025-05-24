import React, { useState, useEffect } from 'react';
import { 
  FaUserPlus, 
  FaBell, 
  FaUser, 
  FaSignOutAlt, 
  FaSearch,
  FaCog,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import '../styles/Topbar.css';

function Topbar({ user, userPhoto, notifications = [], onProfile, onLogout, onSearch, onInvite }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const handleProfileClick = () => {
    setShowProfile(!showProfile);
    setShowNotifications(false);
  };

  const handleNotificationsClick = () => {
    setShowNotifications(!showNotifications);
    setShowProfile(false);
  };

  const handleClickOutside = (event) => {
    if (event.target.closest('.logout-btn')) return;
    if (showProfile && !event.target.closest('.profile-container')) setShowProfile(false);
    if (showNotifications && !event.target.closest('.notifications-container')) setShowNotifications(false);
  };

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfile, showNotifications]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-appname">CollabEase</span>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search projects, tasks, and team..." 
            onChange={onSearch} 
          />
        </div>
      </div>

      <div className="topbar-actions">
        <button
          className="theme-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {darkMode ? <i className="fas fa-sun"></i> : <i className="fas fa-moon"></i>}
        </button>

        <button className="icon-button invite-btn" title="Invite Team Member" onClick={onInvite}>
          <FaUserPlus />
        </button>

        <div className="notifications-container">
          <button className="icon-button" onClick={handleNotificationsClick} title="Notifications">
            <FaBell />
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </button>
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                <button className="mark-all-read">Mark all as read</button>
              </div>
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div key={notification.id} className="notification-item">
                    <div className="notification-content">
                      <p>{notification.message}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-container">
          <button className="icon-button profile-btn" onClick={handleProfileClick} title="Profile">
            {userPhoto ? (
              <img src={userPhoto} alt="Profile" className="profile-image" />
            ) : (
              <span className="profile-initial">{user?.name?.charAt(0) || user?.email?.charAt(0)}</span>
            )}
          </button>
          {showProfile && (
            <div className="profile-dropdown">
              <div className="profile-info">
                {userPhoto ? (
                  <img src={userPhoto} alt="Profile" className="profile-image-large" />
                ) : (
                  <div className="profile-initial-large">
                    {user?.name?.charAt(0) || user?.email?.charAt(0)}
                  </div>
                )}
                <h3>{user?.name || 'User'}</h3>
                <p>{user?.email}</p>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-link" onClick={onProfile}>
                <FaUser />
                View Profile
              </button>
              <button className="dropdown-link">
                <FaCog />
                Settings
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-link logout-btn" onClick={onLogout}>
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar; 