import React, { useState } from 'react';
import Hero from './components/Hero';
import IntakeForm from './components/IntakeForm';
import BackgroundAnimation from './components/BackgroundAnimation';
import Sidebar from './components/Sidebar';
import DispatchHistory from './components/DispatchHistory';

function App() {
  const [currentView, setCurrentView] = useState('generation');

  return (
    <div className="relative w-full min-h-screen flex">
      <BackgroundAnimation />
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="relative z-10 flex-1 pb-20 md:pb-0 md:ml-64 flex flex-col">
        {currentView === 'generation' ? (
          <>
            <Hero />
            <IntakeForm />
          </>
        ) : (
          <DispatchHistory />
        )}
      </div>
    </div>
  );
}

export default App;
