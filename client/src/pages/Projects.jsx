import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import '../styles/Topbar.css';
import { FaFolderOpen, FaRegCalendarAlt, FaUsers, FaTasks, FaEdit, FaTrash, FaEye, FaArrowLeft, FaPlus, FaGripVertical, FaSyncAlt, FaListUl, FaCheckCircle, FaSearch, FaList, FaSpinner, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
// import { useSelector } from 'react-redux'; // For user info if needed

const socket = io("http://localhost:5000"); // Adjust backend URL as needed

function Projects({ user, setUser }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState(["To Do", "In Progress", "Completed"]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showHistoryTask, setShowHistoryTask] = useState(null);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("Tasks");
  const [search, setSearch] = useState("");
  const [userPhoto, setUserPhoto] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    due: '',
    status: 'Active',
    team: [],
    color: '#4F8CFF',
    priority: 'Medium',
    files: [],
  });
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due: '', status: 'To Do', assignedTo: '', priority: 'Medium', tags: '', files: [] });
  const [showEditTask, setShowEditTask] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [comments, setComments] = useState({}); // { [taskId]: [{user, text, time}] }
  const [commentDrafts, setCommentDrafts] = useState({}); // { [taskId]: 'draft text' }
  const commentInputRefs = useRef({});
  const [toastMessages, setToastMessages] = useState([]);
  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    dueDate: 'all',
    assignee: 'all'
  });
  const [taskSearch, setTaskSearch] = useState('');
  const [showTaskFilters, setShowTaskFilters] = useState(false);

  // Real-time notifications (Socket.io)
  useEffect(() => {
    socket.on("task-update", (msg) => {
      setToastMessages((prev) => [...prev, { id: Date.now(), text: msg, type: 'info' }]);
    });
    socket.on('new-comment', ({ taskId, comment }) => {
      setToastMessages((prev) => [...prev, { id: Date.now(), text: `New comment on task: ${comment.text}`, type: 'info' }]);
    });
    return () => {
      socket.off("task-update");
      socket.off("new-comment");
    };
  }, []);

  // Fetch user profile photo
  useEffect(() => {
    const fetchUserPhoto = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUserPhoto(data.photo || null);
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    };
    fetchUserPhoto();
  }, []);

  // Load drafts from localStorage on mount
  useEffect(() => {
    const savedDrafts = JSON.parse(localStorage.getItem('taskCommentDrafts') || '{}');
    setCommentDrafts(savedDrafts);
  }, []);
  // Save drafts to localStorage on change
  useEffect(() => {
    localStorage.setItem('taskCommentDrafts', JSON.stringify(commentDrafts));
  }, [commentDrafts]);

  // Socket.io: Listen for new comments
  useEffect(() => {
    socket.on('new-comment', ({ taskId, comment }) => {
      setComments(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), comment]
      }));
    });
    return () => socket.off('new-comment');
  }, []);

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        setProjects([]);
      }
    };
    fetchProjects();
  }, []);

  // Fetch tasks for selected project
  useEffect(() => {
    if (!selectedProject) return;
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/tasks/project/${selectedProject._id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        const data = await res.json();
        setTasks(data);
      } catch (err) {
        setTasks([]);
      }
    };
    fetchTasks();
  }, [selectedProject]);

  // Navigation handlers
  const handleProfileNavigation = () => {
    // Optionally close dropdowns if you have them
    window.location.href = '/profile';
  };
  const handleLogout = async () => {
    if (setUser) setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
    try {
      await fetch("http://localhost:5000/auth/logout", {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Filter tasks for selected project
  const projectTasks = selectedProject
    ? tasks.filter(t => t.projectId === selectedProject._id)
    : [];

  // Stats
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === "Completed").length;
  const inProgressTasks = projectTasks.filter(t => t.status === "In Progress").length;
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered projects
  const filteredProjects = projects.filter(project => {
    if (priorityFilter !== 'All' && project.priority !== priorityFilter) return false;
    if (search && !project.name.toLowerCase().includes(search.toLowerCase()) && !project.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Drag and drop handlers
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("id", id);
  };
  const onDrop = async (e, status) => {
    const taskId = e.dataTransfer.getData("id");
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: status.toLowerCase(),
          updatedBy: user._id
        })
      });

      if (!res.ok) throw new Error('Failed to update task status');
      
      const data = await res.json();
      setTasks(prev => prev.map(task => task._id === taskId ? data : task));

      // Emit socket event for real-time update
      socket.emit('task:updated', {
        task: data,
        projectId: selectedProject._id
      });

      setToastMessages(prev => [...prev, { 
        id: Date.now(), 
        text: `Task moved to ${status}`, 
        type: 'info' 
      }]);
    } catch (err) {
      console.error('Task status update error:', err);
      setToastMessages(prev => [...prev, { 
        id: Date.now(), 
        text: err.message || 'Failed to update task status', 
        type: 'error' 
      }]);
    }
  };
  const onDragOver = (e) => e.preventDefault();

  // Add custom status
  const addCustomStatus = () => {
    if (customStatusInput && !statuses.includes(customStatusInput)) {
      setStatuses([...statuses, customStatusInput]);
      setCustomStatusInput("");
    }
  };

  // Pin/unpin task
  const togglePin = (id) => {
    setTasks((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, pinned: !task.pinned } : task
      )
    );
  };

  // Subtask completion
  const toggleSubtask = (taskId, subId) => {
    setTasks((tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s
              ),
            }
          : task
      )
    );
  };

  // Due date color
  const dueColor = (due) => {
    const today = new Date().toISOString().slice(0, 10);
    if (due < today) return "overdue";
    if (due === today) return "due-today";
    return "future";
  };

  // File attachment (mock)
  const attachFile = (taskId, file) => {
    setTasks((tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              attachments: [...task.attachments, { name: file.name, url: URL.createObjectURL(file) }],
            }
          : task
      )
    );
  };

  // AI Suggestion (mock)
  const aiSuggest = (title) => {
    if (title.toLowerCase().includes("bug")) return { tag: "#bug", due: "2024-06-12" };
    return {};
  };

  // Add task handler
  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.due,
        status: newTask.status || 'todo',
        priority: (newTask.priority || 'medium').toLowerCase(),
        tags: newTask.tags.split(',').map(t => t.trim()),
        project: selectedProject._id,
        assignee: newTask.assignedTo || null,
        createdBy: user._id
      };

      const res = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(taskData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create task');
      }
      
      const data = await res.json();
      setTasks(prev => [...prev, data]);
      setShowAddTask(false);
      setNewTask({ 
        title: '', 
        description: '', 
        due: '', 
        status: 'todo', 
        assignedTo: '', 
        priority: 'medium', 
        tags: '', 
        files: [] 
      });

      // Emit socket event for real-time update
      socket.emit('task:created', {
        task: data,
        projectId: selectedProject._id
      });

      setToastMessages(prev => [...prev, { 
        id: Date.now(), 
        text: 'Task created successfully!', 
        type: 'success' 
      }]);
    } catch (err) {
      console.error('Task creation error:', err);
      setToastMessages(prev => [...prev, { 
        id: Date.now(), 
        text: err.message || 'Failed to create task', 
        type: 'error' 
      }]);
    }
  };

  // Add file handler
  const handleTaskFileChange = (e) => {
    setNewTask({ ...newTask, files: [...newTask.files, ...Array.from(e.target.files)] });
  };

  // Edit task handler
  const handleEditTask = (task) => {
    setEditTask(task);
    setShowEditTask(true);
  };
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/tasks/${editTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          ...editTask,
          tags: editTask.tags.split(',').map(t => t.trim())
        })
      });
      const data = await res.json();
      setTasks(prev => prev.map(t => t._id === editTask._id ? data : t));
      setShowEditTask(false);
      setEditTask(null);
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Task updated successfully!', type: 'success' }]);
    } catch (err) {
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to update task', type: 'error' }]);
    }
  };
  const handleEditTaskFileChange = (e) => {
    setEditTask({ ...editTask, files: [...(editTask.files || []), ...Array.from(e.target.files)] });
  };

  // Add comment handler
  const handleAddComment = (taskId) => {
    const text = commentDrafts[taskId]?.trim();
    if (!text) return;
    const comment = {
      user: user?.name || 'User',
      text,
      time: new Date().toISOString(),
    };
    setComments(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), comment]
    }));
    setCommentDrafts(prev => ({ ...prev, [taskId]: '' }));
    socket.emit('add-comment', { taskId, comment });
    setToastMessages((prev) => [...prev, { id: Date.now(), text: 'Comment added!', type: 'success' }]);
  };

  // Tabs content
  const renderTabs = () => {
    if (activeTab === "Tasks") {
      return (
        <>
          <div className="project-filters flex items-center gap-2 mb-4">
            <button className={`add-task-btn`}>+ Add Task</button>
            <button className={`filter-btn${filterStatus === "All" ? " active" : ""}`} onClick={() => setFilterStatus("All")}>All</button>
            {statuses.map(status => (
              <button key={status} className={`filter-btn${filterStatus === status ? " active" : ""}`} onClick={() => setFilterStatus(status)}>{status}</button>
            ))}
            <input
              type="text"
              className="task-search"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="kanban-board horizontal-kanban">
            {statuses.map((status) => (
              <div
                key={status}
                onDrop={(e) => onDrop(e, status)}
                onDragOver={onDragOver}
                className="kanban-column"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h2>{status}{status === 'In Progress' && <FaSyncAlt style={{marginLeft:6, color:'#4F8CFF'}} />}</h2>
                  <span className="kanban-count">{filteredProjects.filter(t => t.status === status).length}</span>
                </div>
                {filteredProjects.filter((task) => task.status === status).length === 0 && (
                  <div className="empty-state">No tasks</div>
                )}
                {filteredProjects.filter((task) => task.status === status).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    className={`kanban-task${task.pinned ? ' pinned' : ''} ${dueColor(task.due)}`}
                  >
                    <div className="task-drag-handle"><FaGripVertical /></div>
                    <div className="flex items-center justify-between">
                      <div className="task-title">{task.title}</div>
                      <div className="task-actions">
                        <button className="edit-task-btn" title="Edit" onClick={() => handleEditTask(task)}><FaEdit /></button>
                        <button className="delete-task-btn" title="Delete" onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}><FaTrash /></button>
                    </div>
                    </div>
                    <div className="task-meta task-badges-row">
                      <span className="task-due"><FaRegCalendarAlt /> {task.due}</span>
                      {task.assignedTo && <span className="task-assigned">{getTeamMemberName(task.assignedTo)}</span>}
                      <span className={`task-priority priority-${(task.priority||'Medium').toLowerCase()}`}>{task.priority}</span>
                      {task.tags && task.tags.length > 0 && <span className="task-tags">{task.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}</span>}
                      </div>
                    <div className="task-comments">
                      <div className="comments-list">
                        {(comments[task.id] || []).map((c, i) => (
                          <div key={i} className="comment-item">
                            <span className="comment-user">{c.user}</span>
                            <span className="comment-text">{c.text}</span>
                            <span className="comment-time">{new Date(c.time).toLocaleString()}</span>
                    </div>
                          ))}
                        </div>
                      <div className="comment-input-row">
                        <input
                          ref={el => commentInputRefs.current[task.id] = el}
                          type="text"
                          className="comment-input"
                          placeholder="Add a comment..."
                          value={commentDrafts[task.id] || ''}
                          onChange={e => setCommentDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(task.id); }}
                        />
                        <button className="add-comment-btn" onClick={() => handleAddComment(task.id)}>Send</button>
                        </div>
                      </div>
                  </div>
                ))}
                {/* Add new custom status column */}
                {status === "Completed" && customStatusInput !== null && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customStatusInput}
                      onChange={(e) => setCustomStatusInput(e.target.value)}
                      placeholder="Add new status"
                      className="border px-2 py-1 rounded text-xs"
                    />
                    <button className="ml-2 px-2 py-1 rounded bg-blue-200 text-xs" onClick={addCustomStatus}>Add</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }
    // Team, Chat, Automations tabs placeholder
    return <div className="empty-state">Coming soon!</div>;
  };

  // Add project handler
  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newProject.name,
        description: newProject.description,
          dueDate: newProject.due,
        status: newProject.status,
        color: newProject.color,
        priority: newProject.priority,
          teamMembers: newProject.team.map(id => ({ user: id, role: 'member' }))
        })
      });
      const data = await res.json();
      setProjects(prev => [...prev, data]);
    setShowAddProject(false);
    setNewProject({
      name: '', description: '', due: '', status: 'Active', team: [], color: '#4F8CFF', priority: 'Medium', files: [],
    });
    setAiSuggestion('');
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Project created successfully!', type: 'success' }]);
    } catch (err) {
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to create project', type: 'error' }]);
    }
  };

  // Update project handler
  const handleUpdateProject = async (projectId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      setProjects(prev => prev.map(p => p._id === projectId ? data : p));
      if (selectedProject?._id === projectId) {
        setSelectedProject(data);
      }
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Project updated successfully!', type: 'success' }]);
    } catch (err) {
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to update project', type: 'error' }]);
    }
  };

  // Delete project handler
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      setProjects(prev => prev.filter(p => p._id !== projectId));
      if (selectedProject?._id === projectId) {
        setSelectedProject(null);
      }
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Project deleted successfully!', type: 'success' }]);
    } catch (err) {
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to delete project', type: 'error' }]);
    }
  };

  // AI Suggestion for project name
  const handleAiSuggest = () => {
    if (newProject.description.toLowerCase().includes('website')) {
      setAiSuggestion('Website Revamp');
      setNewProject({ ...newProject, name: 'Website Revamp' });
    } else if (newProject.description.toLowerCase().includes('app')) {
      setAiSuggestion('Mobile App Launch');
      setNewProject({ ...newProject, name: 'Mobile App Launch' });
    } else {
      setAiSuggestion('New Project');
      setNewProject({ ...newProject, name: 'New Project' });
    }
  };

  // File upload
  const handleFileChange = (e) => {
    setNewProject({ ...newProject, files: [...newProject.files, ...Array.from(e.target.files)] });
  };

  // Main layout: using dashboard layout
  useEffect(() => {
    if (showAddProject) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showAddProject]);

  // Remove toast message
  const removeToastMessage = (id) => {
    setToastMessages((prev) => prev.filter(msg => msg.id !== id));
  };

  // Helper function to get team member by ID
  const getTeamMember = (memberId) => {
    if (!selectedProject?.teamMembers) return null;
    return selectedProject.teamMembers.find(m => m.user._id === memberId)?.user;
  };

  // Helper function to get team member name
  const getTeamMemberName = (memberId) => {
    const member = getTeamMember(memberId);
    return member?.displayName || member?.email || 'Unassigned';
  };

  // Helper function to get team member avatar
  const getTeamMemberAvatar = (memberId) => {
    const member = getTeamMember(memberId);
    return member?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(getTeamMemberName(memberId))}`;
  };

  // Delete task handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      setTasks(prev => prev.filter(t => t._id !== taskId));
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Task deleted successfully!', type: 'success' }]);
    } catch (err) {
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to delete task', type: 'error' }]);
    }
  };

  // Listen for real-time task updates
  useEffect(() => {
    socket.on('task:created', ({ task, projectId }) => {
      if (selectedProject?._id === projectId) {
        setTasks(prev => [...prev, task]);
      }
    });

    socket.on('task:updated', ({ task, projectId }) => {
      if (selectedProject?._id === projectId) {
        setTasks(prev => prev.map(t => t._id === task._id ? task : t));
      }
    });

    socket.on('task:deleted', ({ taskId, projectId }) => {
      if (selectedProject?._id === projectId) {
        setTasks(prev => prev.filter(t => t._id !== taskId));
      }
    });

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, [selectedProject]);

  const filterTasks = (tasks) => {
    return tasks.filter(task => {
      // Search filter
      if (taskSearch && !task.title.toLowerCase().includes(taskSearch.toLowerCase())) {
        return false;
      }

      // Status filter
      if (taskFilters.status !== 'all' && task.status !== taskFilters.status) {
        return false;
      }

      // Priority filter
      if (taskFilters.priority !== 'all' && task.priority !== taskFilters.priority) {
        return false;
      }

      // Due date filter
      if (taskFilters.dueDate !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);

        switch (taskFilters.dueDate) {
          case 'today':
            if (taskDate.getTime() !== today.getTime()) return false;
            break;
          case 'overdue':
            if (taskDate >= today || task.status === 'completed') return false;
            break;
          case 'upcoming':
            if (taskDate <= today) return false;
            break;
        }
      }

      // Assignee filter
      if (taskFilters.assignee !== 'all') {
        if (taskFilters.assignee === 'me' && task.assignee !== user._id) return false;
        if (taskFilters.assignee !== 'me' && task.assignee !== taskFilters.assignee) return false;
      }

      return true;
    });
  };

  const getDueDateColor = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === today.getTime()) return 'due-today';
    if (taskDate < today) return 'due-overdue';
    return 'due-upcoming';
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <Toast messages={toastMessages} removeMessage={removeToastMessage} />
      <div style={{flex:1}}>
        <Topbar
          user={user}
          userPhoto={userPhoto}
          notifications={notifications}
          onProfile={handleProfileNavigation}
          onLogout={handleLogout}
        />
        <main className="main-content" style={{paddingTop:'80px'}}>
          {showAddProject && (
            <div className="modal">
              <div className="modal-content" style={{maxWidth: 500}}>
                <h2>Add New Project</h2>
                <form onSubmit={handleAddProject}>
                  <label>Project Name</label>
                  <input type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} required />
                  <button type="button" className="ai-btn" onClick={handleAiSuggest}>AI Suggest Name</button>
                  {aiSuggestion && <div className="ai-suggestion">AI: {aiSuggestion}</div>}
                  <label>Description</label>
                  <textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} required />
                  <label>Due Date</label>
                  <input type="date" value={newProject.due} onChange={e => setNewProject({...newProject, due: e.target.value})} required />
                  <label>Status</label>
                  <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})}>
                    <option>Active</option>
                    <option>Planning</option>
                    <option>Completed</option>
                  </select>
                  <label>Priority</label>
                  <select value={newProject.priority} onChange={e => setNewProject({...newProject, priority: e.target.value})}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <label>Color Label</label>
                  <input type="color" value={newProject.color} onChange={e => setNewProject({...newProject, color: e.target.value})} style={{width: 40, height: 30, border: 'none', background: 'none'}} />
                  <label>Team Members</label>
                  <select multiple value={newProject.team} onChange={e => setNewProject({...newProject, team: Array.from(e.target.selectedOptions, o => o.value)})}>
                    {selectedProject?.teamMembers?.map(member => (
                      <option key={member.user._id} value={member.user._id}>
                        {member.user.displayName || member.user.email}
                      </option>
                    ))}
                  </select>
                  <label>Attachments</label>
                  <input type="file" multiple onChange={handleFileChange} />
                  <div className="modal-buttons">
                    <button type="submit" className="submit-btn">Add Project</button>
                    <button type="button" className="cancel-btn" onClick={() => setShowAddProject(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {!selectedProject ? (
            <div className="all-projects-view">
              <div className="dashboard-header">
                <h1>All Projects</h1>
                <div style={{display:'flex',gap:'1rem',alignItems:'center'}}>
                  <select className="priority-filter" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                    <option value="All">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <input
                    type="text"
                    className="project-search"
                    placeholder="Search projects..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <button className="create-btn" onClick={() => {
                    setShowAddProject(true);
                    setNewProject({
                      name: '', description: '', due: '', status: 'Active', team: [], color: '#4F8CFF', priority: 'Medium', files: [],
                    });
                    setAiSuggestion('');
                  }}>
                    <FaFolderOpen style={{marginRight:4}}/> New Project
                </button>
                </div>
              </div>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <i className="fas fa-project-diagram"></i>
                  <div className="stat-info">
                    <h3>Total Projects</h3>
                    <p>{projects.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="fas fa-tasks"></i>
                  <div className="stat-info">
                    <h3>Active Tasks</h3>
                    <p>{tasks.filter(t => t.status !== "Completed").length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="fas fa-check-circle"></i>
                  <div className="stat-info">
                    <h3>Completed</h3>
                    <p>{tasks.filter(t => t.status === "Completed").length}</p>
                  </div>
                </div>
              </div>
              <div className="dashboard-sections">
                <section className="section">
                  <div className="section-header">
                    <h2>Recent Projects</h2>
                    <button className="add-btn" onClick={() => {
                      setShowAddProject(true);
                      setNewProject({
                        name: '', description: '', due: '', status: 'Active', team: [], color: '#4F8CFF', priority: 'Medium', files: [],
                      });
                      setAiSuggestion('');
                    }}>
                      <FaFolderOpen style={{marginRight:4}}/> Add Project
                    </button>
                  </div>
                  <div className="projects-grid">
                    {filteredProjects.map(project => {
                      const projectTaskCount = tasks.filter(t => t.projectId === project._id).length;
                      return (
                      <div
                        key={project._id}
                          className="project-card modern-project-card"
                          style={{ borderLeft: `6px solid ${project.color || '#4F8CFF'}` }}
                        onClick={() => setSelectedProject(project)}
                      >
                          <div className="project-card-header">
                            <div className="project-card-icon"><FaFolderOpen /></div>
                            <div className="project-card-title">{project.name}</div>
                            <span className={`project-status-badge status-${project.status.toLowerCase()}`}>{project.status}</span>
                            <span className={`project-priority-badge priority-${(project.priority||'Medium').toLowerCase()}`}>{project.priority}</span>
                        </div>
                          <div className="project-card-desc">{project.description}</div>
                          <div className="project-card-meta">
                            <span className="project-card-due"><FaRegCalendarAlt /> {project.due}</span>
                            <span className="project-card-tasks"><FaTasks /> {projectTaskCount} Tasks</span>
                        </div>
                          <div className="project-card-team">
                            {project.teamMembers?.slice(0, 3).map(member => (
                              <div key={member.user._id} className="member-avatar">
                                <img src={member.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.displayName || member.user.email)}`} alt={member.user.displayName || member.user.email} />
                              </div>
                            ))}
                          </div>
                          <div className="project-card-actions">
                            <button className="action-btn view" title="View" onClick={() => setSelectedProject(project)}><FaEye /></button>
                            <button className="action-btn edit" title="Edit" onClick={() => handleUpdateProject(project._id, { /* updates */ })}><FaEdit /></button>
                            <button className="action-btn delete" title="Delete" onClick={() => handleDeleteProject(project._id)}><FaTrash /></button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="project-details-page">
              <div className="project-details-header">
                <button className="back-btn" onClick={() => setSelectedProject(null)}>
                  <FaArrowLeft />
              </button>
                <h2 style={{margin:'0 1rem'}}>{selectedProject?.name}</h2>
                {user.role === 'admin' && (
                  <div className="project-details-actions">
                    <button className="action-btn edit" title="Edit" onClick={() => handleUpdateProject(selectedProject._id, { /* updates */ })}><FaEdit /></button>
                    <button className="action-btn delete" title="Delete" onClick={() => handleDeleteProject(selectedProject._id)}><FaTrash /></button>
                  </div>
                )}
                </div>
              {/* Tab bar */}
              <div className="project-tabs">
                <button className={`project-tab${activeTab==='Tasks' ? ' active' : ''}`} onClick={()=>setActiveTab('Tasks')}>Tasks</button>
                <button className={`project-tab${activeTab==='Team' ? ' active' : ''}`} onClick={()=>setActiveTab('Team')}>Team</button>
                  </div>
              <div className="project-tab-content">
                {activeTab === 'Tasks' && (
                  <>
                    {user.role === 'admin' && (
                      <div className="add-task-bar">
                        <button className="add-task-btn" onClick={() => setShowAddTask(true)}><FaPlus /> Add Task</button>
                </div>
                    )}
                    {showAddTask && user.role === 'admin' && (
                      <div className="add-task-modal-bg">
                        <div className="add-task-modal">
                          <form onSubmit={handleAddTask}>
                            <label>Task Title</label>
                            <input type="text" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />
                            <label>Description</label>
                            <textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                            <label>Due Date</label>
                            <input type="date" value={newTask.due} onChange={e => setNewTask({ ...newTask, due: e.target.value })} required />
                            <label>Status</label>
                            <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}>
                              {statuses.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <label>Priority</label>
                            <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                              <option>High</option>
                              <option>Medium</option>
                              <option>Low</option>
                            </select>
                            <label>Tags (comma separated)</label>
                            <input type="text" placeholder="e.g. frontend, urgent" value={newTask.tags} onChange={e => setNewTask({ ...newTask, tags: e.target.value })} />
                            <label>Assign To</label>
                            <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}>
                              <option value="">Unassigned</option>
                              {selectedProject?.teamMembers?.map(member => (
                                <option key={member.user._id} value={member.user._id}>
                                  {member.user.displayName || member.user.email}
                                </option>
                              ))}
                            </select>
                            <label>Attachments</label>
                            <input type="file" multiple onChange={handleTaskFileChange} />
                            <div className="modal-buttons">
                              <button type="submit" className="submit-btn">Add</button>
                              <button type="button" className="cancel-btn" onClick={() => setShowAddTask(false)}>Cancel</button>
                  </div>
                          </form>
                </div>
              </div>
                    )}
                    <div className="task-section">
                      <div className="task-filters">
                        <div className="task-search">
                          <input
                            type="text"
                            placeholder="Search tasks..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                          />
                          <FaSearch className="task-search-icon" />
                </div>
                        <div className="filter-group">
                          <label className="filter-label">Status:</label>
                          <select
                            className="filter-select"
                            value={taskFilters.status}
                            onChange={(e) => setTaskFilters(prev => ({ ...prev, status: e.target.value }))}
                          >
                            <option value="all">All</option>
                            <option value="todo">To Do</option>
                            <option value="inprogress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                          </select>
              </div>
                        <div className="filter-group">
                          <label className="filter-label">Priority:</label>
                          <select
                            className="filter-select"
                            value={taskFilters.priority}
                            onChange={(e) => setTaskFilters(prev => ({ ...prev, priority: e.target.value }))}
                          >
                            <option value="all">All</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                        <div className="filter-group">
                          <label className="filter-label">Due Date:</label>
                          <select
                            className="filter-select"
                            value={taskFilters.dueDate}
                            onChange={(e) => setTaskFilters(prev => ({ ...prev, dueDate: e.target.value }))}
                          >
                            <option value="all">All</option>
                            <option value="today">Due Today</option>
                            <option value="overdue">Overdue</option>
                            <option value="upcoming">Upcoming</option>
                          </select>
                        </div>
                        <div className="filter-group">
                          <label className="filter-label">Assignee:</label>
                          <select
                            className="filter-select"
                            value={taskFilters.assignee}
                            onChange={(e) => setTaskFilters(prev => ({ ...prev, assignee: e.target.value }))}
                          >
                            <option value="all">All</option>
                            <option value="me">Assigned to Me</option>
                            {selectedProject?.teamMembers?.map(member => (
                              <option key={member.user._id} value={member.user._id}>
                                {member.user.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="kanban-board">
                        {['todo', 'inprogress', 'completed', 'blocked'].map((status) => (
                          <div
                            key={status}
                            className="kanban-column"
                            onDragOver={(e) => onDragOver(e)}
                            onDrop={(e) => onDrop(e, status)}
                          >
                            <div className="kanban-column-header">
                              <div className="kanban-column-title">
                                {status === 'todo' && <FaList />}
                                {status === 'inprogress' && <FaSpinner />}
                                {status === 'completed' && <FaCheck />}
                                {status === 'blocked' && <FaExclamationTriangle />}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </div>
                              <div className="kanban-column-count">
                                {filterTasks(projectTasks.filter(task => task.status === status)).length}
                              </div>
                            </div>
                            {filterTasks(projectTasks.filter(task => task.status === status)).map((task) => (
                              <div
                                key={task._id}
                                draggable={user.role === 'admin'}
                                onDragStart={user.role === 'admin' ? (e) => onDragStart(e, task._id) : undefined}
                                className={`kanban-task ${getDueDateColor(task.dueDate)}`}
                              >
                                <div className="task-drag-handle">{user.role === 'admin' && <FaGripVertical />}</div>
                                <div className="flex items-center justify-between">
                                  <div className="task-title">{task.title}</div>
                                  <div className="task-actions">
                                    {(user.role === 'admin' || task.createdBy === user._id) && (
                                      <>
                                        <button className="edit-task-btn" title="Edit" onClick={() => handleEditTask(task)}>
                                          <FaEdit />
                  </button>
                                        <button className="delete-task-btn" title="Delete" onClick={() => handleDeleteTask(task._id)}>
                                          <FaTrash />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="task-meta task-badges-row">
                                  <span className="task-due">
                                    <FaRegCalendarAlt /> {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                  {task.assignee && (
                                    <span className="task-assigned">
                                      <img 
                                        src={getTeamMemberAvatar(task.assignee)} 
                                        alt={getTeamMemberName(task.assignee)}
                                        className="task-assignee-avatar"
                                      />
                                      {getTeamMemberName(task.assignee)}
                                    </span>
                                  )}
                                  <span className={`task-priority priority-${(task.priority||'medium').toLowerCase()}`}>
                                    {task.priority}
                                  </span>
                                  {task.tags && task.tags.length > 0 && (
                                    <span className="task-tags">
                                      {task.tags.map(tag => (
                                        <span key={tag} className="tag-chip">{tag}</span>
                                      ))}
                                    </span>
                                  )}
              </div>
                                <div className="task-comments">
                                  <div className="comments-list">
                                    {(comments[task._id] || []).map((c, i) => (
                                      <div key={i} className="comment-item">
                                        <span className="comment-user">{c.user}</span>
                                        <span className="comment-text">{c.text}</span>
                                        <span className="comment-time">{new Date(c.time).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="comment-input-row">
                                    <input
                                      ref={el => commentInputRefs.current[task._id] = el}
                                      type="text"
                                      className="comment-input"
                                      placeholder="Add a comment..."
                                      value={commentDrafts[task._id] || ''}
                                      onChange={e => setCommentDrafts(prev => ({ ...prev, [task._id]: e.target.value }))}
                                      onKeyDown={e => { if (e.key === 'Enter') handleAddComment(task._id); }}
                                    />
                                    <button className="add-comment-btn" onClick={() => handleAddComment(task._id)}>Send</button>
                                  </div>
                                </div>
                                {/* If member and assigned, show mark as complete button */}
                                {user.role !== 'admin' && task.assignee === user._id && task.status !== 'completed' && (
                                  <button className="mark-complete-btn" onClick={() => onDrop({ dataTransfer: { getData: () => task._id } }, 'completed')}>Mark as Complete</button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {activeTab === 'Team' && (
                  <div className="empty-state">Team tab content placeholder</div>
                )}
              </div>
              {/* Task History Modal */}
              {showHistoryTask && (
                <div className="history-modal-bg">
                  <div className="history-modal">
                    <h2>Task History</h2>
                    <ul>
                      {projectTasks.find((t) => t.id === showHistoryTask)?.history.map((h, i) => (
                        <li key={i}>
                          <b>{getTeamMemberName(h.user)}</b> {h.action} <span style={{ color: '#888' }}>{new Date(h.at).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                    <button className="close-btn" onClick={() => setShowHistoryTask(null)}>Close</button>
                  </div>
                </div>
              )}
              {showEditTask && (
                <div className="add-task-modal-bg">
                  <div className="add-task-modal">
                    <form onSubmit={handleUpdateTask}>
                      <label>Task Title</label>
                      <input type="text" value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} required />
                      <label>Description</label>
                      <textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} />
                      <label>Due Date</label>
                      <input type="date" value={editTask.due} onChange={e => setEditTask({ ...editTask, due: e.target.value })} required />
                      <label>Status</label>
                      <select value={editTask.status} onChange={e => setEditTask({ ...editTask, status: e.target.value })}>
                        {statuses.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <label>Priority</label>
                      <select value={editTask.priority} onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                      <label>Tags (comma separated)</label>
                      <input type="text" value={Array.isArray(editTask.tags) ? editTask.tags.join(', ') : editTask.tags} onChange={e => setEditTask({ ...editTask, tags: e.target.value })} />
                      <label>Assign To</label>
                      <select value={editTask.assignedTo} onChange={e => setEditTask({ ...editTask, assignedTo: e.target.value })}>
                        <option value="">Unassigned</option>
                        {selectedProject?.teamMembers?.map(member => (
                          <option key={member.user._id} value={member.user._id}>
                            {member.user.displayName || member.user.email}
                          </option>
                        ))}
                      </select>
                      <label>Attachments</label>
                      <input type="file" multiple onChange={handleEditTaskFileChange} />
                      <div className="modal-buttons">
                        <button type="submit" className="submit-btn">Save</button>
                        <button type="button" className="cancel-btn" onClick={() => setShowEditTask(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Projects; 