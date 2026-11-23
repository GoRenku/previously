import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { ErrorBoundary } from './ErrorBoundary';
import Home from './pages/Home';
import { CatchUp, ShowLayout } from './pages/Show';
import { Ask, Clips, EpisodeDetail, Episodes, World } from './pages/sections';
import { CharacterDetail, Characters } from './pages/characters';
import { Storylines } from './pages/storylines';
import Privacy from './pages/Privacy';
import { AnalyticsRoutes } from './consent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AnalyticsRoutes />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/show/:id" element={<ShowLayout />}>
          <Route index element={<CatchUp />} />
          <Route path="characters" element={<Characters />} />
          <Route path="characters/:cid" element={<CharacterDetail />} />
          <Route path="storylines" element={<Storylines />} />
          <Route path="episodes" element={<Episodes />} />
          <Route path="episodes/:code" element={<EpisodeDetail />} />
          <Route path="world" element={<World />} />
          <Route path="clips" element={<Clips />} />
          <Route path="ask" element={<Ask />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
