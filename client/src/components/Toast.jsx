import React, { useEffect } from 'react';
import '../styles/Toast.css';

function Toast({ messages, removeMessage }) {
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        removeMessage(messages[0].id);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [messages, removeMessage]);

  return (
    <div className="toast-container">
      {messages.map(msg => (
        <div key={msg.id} className={`toast toast-${msg.type || 'info'}`}>
          {msg.text}
        </div>
      ))}
    </div>
  );
}

export default Toast; 
 
 
 