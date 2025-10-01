import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BattleEngine } from '../utils/battleEngine';
import { BattleState, HeroSettings } from '../types';
import './BattleSimulationPage.css';

type SimulationMode = 'setup' | 'manual' | 'auto' | 'result';

function BattleSimulationPage() {
  const { decks, cards, characteristics, heroSettings } = useGame();
  
  const [mode, setMode] = useState<SimulationMode>('setup');
  const [selectedDeck1, setSelectedDeck1] = useState<string>('');
  const [selectedDeck2, setSelectedDeck2] = useState<string>('');
  const [hero1Settings, setHero1Settings] = useState<HeroSettings>(heroSettings);
  const [hero2Settings, setHero2Settings] = useState<HeroSettings>(heroSettings);
  
  const [battleEngine, setBattleEngine] = useState<BattleEngine | null>(null);
  const [currentState, setCurrentState] = useState<BattleState | null>(null);
  const [battleHistory, setBattleHistory] = useState<BattleState[]>([]);
  const [showLog, setShowLog] = useState(false);

  const startSimulation = (isManual: boolean) => {
    if (!selectedDeck1 || !selectedDeck2) {
      alert('Выберите колоды для обоих героев!');
      return;
    }

    const deck1 = decks.find(d => d.id === selectedDeck1);
    const deck2 = decks.find(d => d.id === selectedDeck2);

    if (!deck1 || !deck2) return;

    const deck1Cards = deck1.cardIds.map(id => cards.find(c => c.id === id)).filter(Boolean) as any[];
    const deck2Cards = deck2.cardIds.map(id => cards.find(c => c.id === id)).filter(Boolean) as any[];

    const engine = new BattleEngine(
      hero1Settings,
      hero2Settings,
      deck1Cards,
      deck2Cards,
      characteristics
    );

    setBattleEngine(engine);
    const initialState = engine.getState();
    setCurrentState(initialState);
    setBattleHistory([initialState]);

    if (isManual) {
      setMode('manual');
    } else {
      // Auto mode
      const finalState = engine.runFullSimulation();
      setCurrentState(finalState);
      setBattleHistory([finalState]);
      setMode('result');
    }
  };

  const nextTurn = () => {
    if (!battleEngine) return;
    
    battleEngine.nextTurn();
    const newState = battleEngine.getState();
    setCurrentState(newState);
    setBattleHistory([...battleHistory, newState]);

    if (battleEngine.isFinished()) {
      setMode('result');
    }
  };

  const prevTurn = () => {
    if (battleHistory.length <= 1) return;
    const newHistory = battleHistory.slice(0, -1);
    setBattleHistory(newHistory);
    setCurrentState(newHistory[newHistory.length - 1]);
  };

  const resetSimulation = () => {
    setMode('setup');
    setBattleEngine(null);
    setCurrentState(null);
    setBattleHistory([]);
    setShowLog(false);
  };

  const getDeckName = (deckId: string) => {
    return decks.find(d => d.id === deckId)?.name || 'Unknown';
  };

  return (
    <div className="battle-simulation-page">
      <div className="page-header">
        <h1>Симуляция Боя</h1>
        <p>Проверьте баланс колод в боевой симуляции</p>
      </div>

      {mode === 'setup' && (
        <div className="setup-container">
          <div className="setup-grid">
            <div className="hero-setup">
              <h2>⚔️ Герой 1</h2>
              
              <div className="form-group">
                <label>Колода</label>
                <select
                  value={selectedDeck1}
                  onChange={(e) => setSelectedDeck1(e.target.value)}
                >
                  <option value="">Выберите колоду</option>
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
              </div>

              <div className="hero-stats">
                <div className="stat-input">
                  <label>❤️ Здоровье</label>
                  <input
                    type="number"
                    value={hero1Settings.health}
                    onChange={(e) => setHero1Settings({...hero1Settings, health: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>
                <div className="stat-input">
                  <label>💧 Мана</label>
                  <input
                    type="number"
                    value={hero1Settings.mana}
                    onChange={(e) => setHero1Settings({...hero1Settings, mana: parseInt(e.target.value)})}
                    min="0"
                  />
                </div>
                <div className="stat-input">
                  <label>⚡ Выносливость</label>
                  <input
                    type="number"
                    value={hero1Settings.stamina}
                    onChange={(e) => setHero1Settings({...hero1Settings, stamina: parseInt(e.target.value)})}
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="vs-divider">VS</div>

            <div className="hero-setup">
              <h2>🛡️ Герой 2</h2>
              
              <div className="form-group">
                <label>Колода</label>
                <select
                  value={selectedDeck2}
                  onChange={(e) => setSelectedDeck2(e.target.value)}
                >
                  <option value="">Выберите колоду</option>
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
              </div>

              <div className="hero-stats">
                <div className="stat-input">
                  <label>❤️ Здоровье</label>
                  <input
                    type="number"
                    value={hero2Settings.health}
                    onChange={(e) => setHero2Settings({...hero2Settings, health: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>
                <div className="stat-input">
                  <label>💧 Мана</label>
                  <input
                    type="number"
                    value={hero2Settings.mana}
                    onChange={(e) => setHero2Settings({...hero2Settings, mana: parseInt(e.target.value)})}
                    min="0"
                  />
                </div>
                <div className="stat-input">
                  <label>⚡ Выносливость</label>
                  <input
                    type="number"
                    value={hero2Settings.stamina}
                    onChange={(e) => setHero2Settings({...hero2Settings, stamina: parseInt(e.target.value)})}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="setup-actions">
            <button
              className="btn-primary btn-large"
              onClick={() => startSimulation(true)}
              disabled={!selectedDeck1 || !selectedDeck2}
            >
              🎮 Режим "По ходу"
            </button>
            <button
              className="btn-success btn-large"
              onClick={() => startSimulation(false)}
              disabled={!selectedDeck1 || !selectedDeck2}
            >
              ⚡ Автоматический режим
            </button>
          </div>

          {decks.length < 2 && (
            <div className="warning-box">
              ⚠️ Создайте минимум 2 колоды для проведения симуляции
            </div>
          )}
        </div>
      )}

      {(mode === 'manual' || mode === 'result') && currentState && (
        <div className="battle-container">
          <div className="battle-header">
            <h2>Ход {currentState.turn}</h2>
            <div className="battle-info">
              <span>{getDeckName(selectedDeck1)} VS {getDeckName(selectedDeck2)}</span>
            </div>
            <button className="btn-secondary" onClick={resetSimulation}>
              Новая симуляция
            </button>
          </div>

          <div className="battle-field">
            <div className="hero-status">
              <h3>⚔️ Герой 1</h3>
              <div className="status-bars">
                <div className="status-bar">
                  <div className="bar-label">
                    <span>❤️ HP</span>
                    <span>{currentState.hero1.currentHealth}/{currentState.hero1.health}</span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill health"
                      style={{width: `${(currentState.hero1.currentHealth / currentState.hero1.health) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div className="status-bar">
                  <div className="bar-label">
                    <span>💧 Mana</span>
                    <span>{currentState.hero1.currentMana}/{currentState.hero1.mana}</span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill mana"
                      style={{width: `${(currentState.hero1.currentMana / currentState.hero1.mana) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div className="status-bar">
                  <div className="bar-label">
                    <span>⚡ Stamina</span>
                    <span>{currentState.hero1.currentStamina}/{currentState.hero1.stamina}</span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill stamina"
                      style={{width: `${(currentState.hero1.currentStamina / currentState.hero1.stamina) * 100}%`}}
                    ></div>
                  </div>
                </div>
                {currentState.hero1.shield > 0 && (
                  <div className="shield-indicator">🛡️ Shield: {currentState.hero1.shield}</div>
                )}
              </div>
              
              {currentState.hero1.activeEffects.length > 0 && (
                <div className="active-effects">
                  <h4>🔮 Активные эффекты</h4>
                  <div className="effects-list">
                    {currentState.hero1.activeEffects.map((effect, idx) => (
                      <div key={idx} className="effect-item">
                        <div className="effect-name-with-icon">
                          {effect.cardIcon && (
                            <span className="effect-icon" style={{ color: effect.cardIconColor }}>
                              {effect.cardIcon}
                            </span>
                          )}
                          <span className="effect-name">{effect.cardName}</span>
                        </div>
                        <span className="effect-duration">⏱️ {effect.remainingDuration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hero-status">
              <h3>🛡️ Герой 2</h3>
              <div className="status-bars">
                <div className="status-bar">
                  <div className="bar-label">
                    <span>❤️ HP</span>
                    <span>{currentState.hero2.currentHealth}/{currentState.hero2.health}</span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill health"
                      style={{width: `${(currentState.hero2.currentHealth / currentState.hero2.health) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div className="status-bar">
                  <div className="bar-label">
                    <span>💧 Mana</span>
                    <span>{currentState.hero2.currentMana}/{currentState.hero2.mana}</span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill mana"
                      style={{width: `${(currentState.hero2.currentMana / currentState.hero2.mana) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div className="status-bar">
                  <div className="bar-label">
                    <span>⚡ Stamina</span>
                    <span>{currentState.hero2.currentStamina}/{currentState.hero2.stamina}</span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill stamina"
                      style={{width: `${(currentState.hero2.currentStamina / currentState.hero2.stamina) * 100}%`}}
                    ></div>
                  </div>
                </div>
                {currentState.hero2.shield > 0 && (
                  <div className="shield-indicator">🛡️ Shield: {currentState.hero2.shield}</div>
                )}
              </div>
              
              {currentState.hero2.activeEffects.length > 0 && (
                <div className="active-effects">
                  <h4>🔮 Активные эффекты</h4>
                  <div className="effects-list">
                    {currentState.hero2.activeEffects.map((effect, idx) => (
                      <div key={idx} className="effect-item">
                        <div className="effect-name-with-icon">
                          {effect.cardIcon && (
                            <span className="effect-icon" style={{ color: effect.cardIconColor }}>
                              {effect.cardIcon}
                            </span>
                          )}
                          <span className="effect-name">{effect.cardName}</span>
                        </div>
                        <span className="effect-duration">⏱️ {effect.remainingDuration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {mode === 'result' && (
            <div className={`result-banner ${currentState.winner === 1 ? 'hero1' : currentState.winner === 2 ? 'hero2' : 'draw'}`}>
              <h2>
                {currentState.winner === 1 && '🏆 Победа Героя 1!'}
                {currentState.winner === 2 && '🏆 Победа Героя 2!'}
                {currentState.winner === null && '🤝 Ничья!'}
              </h2>
              <p>Бой длился {currentState.turn} ходов</p>
            </div>
          )}

          <div className="battle-controls">
            {mode === 'manual' && (
              <>
                <button
                  className="btn-secondary"
                  onClick={prevTurn}
                  disabled={battleHistory.length <= 1}
                >
                  ← Пред. ход
                </button>
                <button
                  className="btn-primary"
                  onClick={nextTurn}
                  disabled={battleEngine?.isFinished()}
                >
                  След. ход →
                </button>
              </>
            )}
            <button className="btn-secondary" onClick={() => setShowLog(!showLog)}>
              {showLog ? 'Скрыть лог' : 'Показать лог'}
            </button>
          </div>

          {showLog && (
            <div className="battle-log">
              <h3>Лог боя</h3>
              <div className="log-entries">
                {currentState.log.map((entry, idx) => (
                  <div key={idx} className="log-entry">
                    <span className="log-turn">[Ход {entry.turn}]</span>
                    {entry.cardIcon && (
                      <span className="log-icon" style={{ color: entry.cardIconColor }}>
                        {entry.cardIcon}
                      </span>
                    )}
                    <span className="log-message">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BattleSimulationPage;
