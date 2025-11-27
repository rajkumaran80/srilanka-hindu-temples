import React from 'react';
import MapComponent from './components/MapComponent';
import NetworkStatus from './components/NetworkStatus';
import './App.css';

function App() {
  return (
    <div className="App">
      <NetworkStatus />
      <header>
        <h1>Sri Lanka Hindu Temples</h1>
      </header>
      <main>
        <MapComponent />
      </main>
    </div>
  );
}

export default App;
