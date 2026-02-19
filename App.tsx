
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InfluencerStudio from './src/pages/InfluencerStudio';
import PixarStudio from './src/pages/PixarStudio';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InfluencerStudio />} />
        <Route path="/pixar" element={<PixarStudio />} />
      </Routes>
    </Router>
  );
};

export default App;
