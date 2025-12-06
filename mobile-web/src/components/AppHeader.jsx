import React from 'react';
import './AppHeader.css';

const AppHeader = ({ currentView, onViewChange }) => {
  return (
    <header className="app-header">
      <h1 className="app-title">Sri Lanka Hindu Temples</h1>
      <div className="header-buttons">
        <button
          className={`header-button ${currentView === 'map' ? 'active' : ''}`}
          onClick={() => onViewChange('map')}
        >
          Map View
        </button>
        <button
          className={`header-button ${currentView === 'tour' ? 'active' : ''}`}
          onClick={() => onViewChange('tour')}
        >
          Planner
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
