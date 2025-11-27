import React, { useState } from 'react';
import MapComponent from './components/MapComponent';
import TourPlanner from './components/TourPlanner';
import AppHeader from './components/AppHeader';
import NetworkStatus from './components/NetworkStatus';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('map'); // 'map' or 'tour'

  return (
    <div className="App">
      <NetworkStatus />
      <AppHeader currentView={currentView} onViewChange={setCurrentView} />
      <main>
        {currentView === 'map' && <MapComponent />}
        {currentView === 'tour' && <TourPlanner />}
      </main>
    </div>
  );
}

export default App;
