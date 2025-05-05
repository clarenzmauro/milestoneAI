import React from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import styles from './Layout.module.css'; 
import { PlanProvider } from '../../contexts/PlanContext';

const Layout: React.FC = () => {
  return (
    <PlanProvider>
      <div className={styles.layoutContainer}>
        <Sidebar />
        <MainContent />
      </div>
    </PlanProvider>
  );
};

export default Layout;
