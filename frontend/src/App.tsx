import { useState, useEffect } from 'react';
import MapView from './components/MapView/MapView';
import UploadForm from './components/UploadForm/UploadForm';
import DeleteForm from './components/DeleteForm/DeleteForm';
import UpdateForm from './components/UpdateForm/UpdateForm';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Listen for back/forward button navigation
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (currentPath === '/upload') {
    return <UploadForm />;
  } else if (currentPath == "/delete") {
    return <DeleteForm />;
  } else if (currentPath === "/update") {
    return <UpdateForm />;
  }

  return (
    <div style={{ margin: 0, padding: 0, width: '100vw', height: '100vh' }}>
      <MapView />
    </div>
  );
}

export default App;