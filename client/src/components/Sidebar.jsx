import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Get user from localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {}

  const navItems = [
    { path: '/dashboard', icon: 'fas fa-home', label: 'Dashboard' },
    { path: '/projects', icon: 'fas fa-project-diagram', label: 'Projects' },
    { path: '/tasks', icon: 'fas fa-tasks', label: 'My Tasks' },
    { path: '/team', icon: 'fas fa-users', label: 'Team' },
  ];

  return (
    <aside className={`sidebar taskati-sidebar${collapsed ? ' collapsed' : ''}`}> 
      <div className="sidebar-header">
        <h1 className="sidebar-appname">CollabEase.</h1>
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          <i className={`fas fa-${collapsed ? 'angle-right' : 'angle-left'}`}></i>
        </button>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}
          >
            <i className={item.icon}></i>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
        {/* Admin Panel tab only for admin */}
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={`sidebar-nav-item${location.pathname === '/admin' ? ' active' : ''}`}
          >
            <i className="fas fa-user-shield"></i>
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar; 