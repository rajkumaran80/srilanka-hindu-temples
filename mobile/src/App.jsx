import React, { useState } from 'react';
import MapComponent from './components/MapComponent';
import TourPlanner from './components/TourPlanner';
import NetworkStatus from './components/NetworkStatus';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('map'); // 'map' or 'tour'

  return (
    <div className="App">
      <NetworkStatus />
      <header>
        <h1>Sri Lanka Hindu Temples</h1>
        <nav className="app-navigation">
          <button
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentView('map')}
          >
            🗺️ Map View
          </button>
          <button
            className={`nav-button ${currentView === 'tour' ? 'active' : ''}`}
            onClick={() => setCurrentView('tour')}
          >
            🏛️ Tour Planner
          </button>
        </nav>
      </header>
      <main>
        {currentView === 'map' && <MapComponent />}
        {currentView === 'tour' && <TourPlanner />}
      </main>
    </div>
  );
}

export default App;
