import Layout from './components/layout/Layout'; 
import { PlanProvider } from './contexts/PlanContext'; 

function App() {
  return (
    <PlanProvider>
      <Layout />
    </PlanProvider>
  );
}

export default App;
