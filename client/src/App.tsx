import React from 'react';
import Layout from './components/layout/Layout'; 
import { PlanProvider } from './contexts/PlanContext'; 
// import logo from './logo.svg'; 
// import './App.css'; 

function App() {
  return (
    <PlanProvider>
      <Layout />
    </PlanProvider>
  );
}

export default App;
