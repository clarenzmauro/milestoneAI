import Layout from './components/layout/Layout'; 
import { PlanProvider } from './contexts/PlanContext'; 
import { Toaster } from 'react-hot-toast'; 

function App() {
  return (
    <PlanProvider>
      <Layout />
      <Toaster position="bottom-right" />
    </PlanProvider>
  );
}

export default App;
