import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/components/Layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { UploadPage } from './features/ingestion/pages/UploadPage';
import { PeoplePage } from './features/knowledge/pages/PeoplePage';
import { EventsPage } from './features/knowledge/pages/EventsPage';
import { PersonDetailsPage } from './features/knowledge/pages/PersonDetailsPage';
import { SearchPage } from './features/knowledge/pages/SearchPage';
import { TimelinePage } from './features/knowledge/pages/TimelinePage';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:id" element={<PersonDetailsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
