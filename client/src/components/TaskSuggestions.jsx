import React from 'react';
import { FaLightbulb, FaPlus } from 'react-icons/fa';
import '../styles/TaskSuggestions.css';

const TaskSuggestions = ({ suggestions, onAddTask }) => {
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    return (
        <div className="task-suggestions">
            <div className="suggestions-header">
                <FaLightbulb className="suggestions-icon" />
                <h3>Suggested Tasks</h3>
            </div>
            <div className="suggestions-list">
                {suggestions.map(suggestion => (
                    <div key={suggestion._id} className="suggestion-item">
                        <div className="suggestion-content">
                            <h4>{suggestion.title}</h4>
                            <p>{suggestion.description}</p>
                            {suggestion.project && (
                                <span className="suggestion-project">
                                    Project: {suggestion.project.title}
                                </span>
                            )}
                        </div>
                        <button 
                            className="add-suggestion-btn"
                            onClick={() => onAddTask(suggestion)}
                            title="Add to my tasks"
                        >
                            <FaPlus />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskSuggestions; 
 
 
 