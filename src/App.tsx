import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import CharacteristicsPage from './pages/CharacteristicsPage';
import HeroSettingsPage from './pages/HeroSettingsPage';
import CardCreationPage from './pages/CardCreationPage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import BattleSimulationPage from './pages/BattleSimulationPage';
import './App.css';

function App() {
  return (
    <GameProvider>
      <Router>
        <div className="app">
          <nav className="navbar">
            <div className="nav-brand">
              <h1>⚔️ CCG Balance Tool</h1>
            </div>
            <ul className="nav-links">
              <li><Link to="/">Характеристики</Link></li>
              <li><Link to="/hero-settings">Настройки Героя</Link></li>
              <li><Link to="/cards">Создание Карт</Link></li>
              <li><Link to="/decks">Сборка Колоды</Link></li>
              <li><Link to="/simulation">Симуляция Боя</Link></li>
            </ul>
          </nav>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<CharacteristicsPage />} />
              <Route path="/hero-settings" element={<HeroSettingsPage />} />
              <Route path="/cards" element={<CardCreationPage />} />
              <Route path="/decks" element={<DeckBuilderPage />} />
              <Route path="/simulation" element={<BattleSimulationPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </GameProvider>
  );
}

export default App;
