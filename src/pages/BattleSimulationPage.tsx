import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BattleEngine } from '../utils/battleEngine';
import { BattleState, HeroSettings, SimulationResult, SimulationAnalytics, Card } from '../types';
import { analyzeSimulations, getCardWinRateByStats, findBestBalancedRanges, getCardsWinRateAtSpecificStats, StatRangeBalance, CardWinRateAtStats, calculatePowerPointSuggestions, calculateScalingSuggestions, PowerPointSuggestion, ScalingSuggestion } from '../utils/simulationAnalytics';
import './BattleSimulationPage.css';

type SimulationMode = 'setup' | 'manual' | 'auto' | 'result' | 'multi-setup' | 'multi-running' | 'multi-results';

interface CardPerformanceChartProps {
  cardId: string;
  analytics: SimulationAnalytics;
  heroSettings: HeroSettings;
}

function CardPerformanceChart({ cardId, analytics, heroSettings }: CardPerformanceChartProps) {
  const cardAnalytics = analytics.cardAnalytics.find(c => c.cardId === cardId);
  if (!cardAnalytics) return <div>Нет данных для этой карты</div>;

  // Create buckets for health and mana/stamina ranges
  const healthBuckets = 5; // Low to High
  const resourceBuckets = 5; // Low to High

  const maxHealth = heroSettings.health * 10;
  const maxResource = Math.max(heroSettings.mana, heroSettings.stamina) * 10;

  const healthStep = maxHealth / healthBuckets;
  const resourceStep = maxResource / resourceBuckets;

  // Build a matrix of win rates
  const matrix: { health: string; resource: string; winRate: number; count: number }[] = [];

  for (let h = 0; h < healthBuckets; h++) {
    for (let r = 0; r < resourceBuckets; r++) {
      const healthMin = h * healthStep;
      const healthMax = (h + 1) * healthStep;
      const resourceMin = r * resourceStep;
      const resourceMax = (r + 1) * resourceStep;

      const stats = getCardWinRateByStats(
        cardId,
        analytics,
        [healthMin, healthMax],
        [resourceMin, resourceMax]
      );

      if (stats.total > 0) {
        matrix.push({
          health: `${Math.floor(healthMin)}-${Math.floor(healthMax)}`,
          resource: `${Math.floor(resourceMin)}-${Math.floor(resourceMax)}`,
          winRate: stats.winRate,
          count: stats.total,
        });
      }
    }
  }

  return (
    <div className="card-performance-chart">
      <div className="chart-info">
        <p><strong>{cardAnalytics.cardName}</strong></p>
        <p>Общий винрейт: {cardAnalytics.winRate.toFixed(1)}%</p>
        <p>Средний HP при победе: {cardAnalytics.avgHealthWhenWin.toFixed(0)}</p>
        <p>Средний HP при поражении: {cardAnalytics.avgHealthWhenLose.toFixed(0)}</p>
        <p>Средняя мана при победе: {cardAnalytics.avgManaWhenWin.toFixed(0)}</p>
        <p>Средняя мана при поражении: {cardAnalytics.avgManaWhenLose.toFixed(0)}</p>
      </div>

      <div className="heatmap-container">
        <h4>Тепловая карта винрейта</h4>
        <p className="heatmap-description">
          Показывает, как винрейт карты зависит от здоровья и маны/выносливости героя
        </p>
        
        <div className="heatmap-grid">
          {Array.from({ length: healthBuckets }).map((_, h) => {
            // Check if this row has any data
            const rowHasData = Array.from({ length: resourceBuckets }).some((_, r) => {
              const cell = matrix.find(
                m =>
                  m.health === `${Math.floor(h * healthStep)}-${Math.floor((h + 1) * healthStep)}` &&
                  m.resource === `${Math.floor(r * resourceStep)}-${Math.floor((r + 1) * resourceStep)}`
              );
              return cell && cell.count > 0;
            });

            // Skip empty rows
            if (!rowHasData) return null;

            return (
              <div key={h} className="heatmap-row">
                <div className="heatmap-label">
                  HP: {Math.floor(h * healthStep)}-{Math.floor((h + 1) * healthStep)}
                </div>
                {Array.from({ length: resourceBuckets }).map((_, r) => {
                  const cell = matrix.find(
                    m =>
                      m.health === `${Math.floor(h * healthStep)}-${Math.floor((h + 1) * healthStep)}` &&
                      m.resource === `${Math.floor(r * resourceStep)}-${Math.floor((r + 1) * resourceStep)}`
                  );

                  const winRate = cell ? cell.winRate : 0;
                  const count = cell ? cell.count : 0;

                  // Skip empty cells
                  if (count === 0) return <div key={r} className="heatmap-cell-empty"></div>;

                  // Color based on win rate
                  let bgColor = '#333';
                  if (winRate >= 60) bgColor = '#4caf50';
                  else if (winRate >= 50) bgColor = '#8bc34a';
                  else if (winRate >= 40) bgColor = '#ffc107';
                  else bgColor = '#f44336';

                  return (
                    <div
                      key={r}
                      className="heatmap-cell"
                      style={{ backgroundColor: bgColor }}
                      title={`${winRate.toFixed(1)}% (${count} боев)`}
                    >
                      {winRate.toFixed(0)}%
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="heatmap-x-labels">
            <div className="heatmap-label-spacer"></div>
            {Array.from({ length: resourceBuckets }).map((_, r) => (
              <div key={r} className="heatmap-x-label">
                {Math.floor(r * resourceStep)}-{Math.floor((r + 1) * resourceStep)}
              </div>
            ))}
          </div>
          <div className="heatmap-x-title">Мана/Выносливость</div>
        </div>

        <div className="heatmap-legend">
          <span>Винрейт:</span>
          <div className="legend-item" style={{ backgroundColor: '#f44336' }}>&lt; 40%</div>
          <div className="legend-item" style={{ backgroundColor: '#ffc107' }}>40-50%</div>
          <div className="legend-item" style={{ backgroundColor: '#8bc34a' }}>50-60%</div>
          <div className="legend-item" style={{ backgroundColor: '#4caf50' }}>&gt; 60%</div>
        </div>
      </div>
    </div>
  );
}

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

  // Multi-simulation state
  const [selectedDecks, setSelectedDecks] = useState<string[]>([]);
  const [numSimulations, setNumSimulations] = useState<number>(100);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [analytics, setAnalytics] = useState<SimulationAnalytics | null>(null);
  const [selectedCardForChart, setSelectedCardForChart] = useState<string>('');
  const [useFixedStats, setUseFixedStats] = useState<boolean>(false);
  
  // Custom stats viewer
  const [customHealth, setCustomHealth] = useState<number>(0);
  const [customManaStamina, setCustomManaStamina] = useState<number>(0);
  const [customStatsResults, setCustomStatsResults] = useState<CardWinRateAtStats[]>([]);
  
  // Balance range analysis
  const [balanceRanges, setBalanceRanges] = useState<StatRangeBalance[]>([]);
  const [powerPointSuggestions, setPowerPointSuggestions] = useState<PowerPointSuggestion[]>([]);
  const [scalingSuggestions, setScalingSuggestions] = useState<ScalingSuggestion[]>([]);

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

  const toggleDeckSelection = (deckId: string) => {
    if (selectedDecks.includes(deckId)) {
      setSelectedDecks(selectedDecks.filter(id => id !== deckId));
    } else {
      setSelectedDecks([...selectedDecks, deckId]);
    }
  };

  const startMultiSimulation = () => {
    if (selectedDecks.length < 2) {
      alert('Выберите минимум 2 колоды для проведения множественных симуляций!');
      return;
    }

    setMode('multi-running');
    setSimulationProgress(0);

    // Run simulations asynchronously
    setTimeout(() => runMultiSimulations(), 100);
  };

  const runMultiSimulations = () => {
    const results: SimulationResult[] = [];

    for (let i = 0; i < numSimulations; i++) {
      // Randomly select two decks from the list
      const deck1Index = Math.floor(Math.random() * selectedDecks.length);
      let deck2Index = Math.floor(Math.random() * selectedDecks.length);
      
      // Ensure different decks (allow same deck if only one selected, but prefer different)
      if (selectedDecks.length > 1) {
        while (deck2Index === deck1Index) {
          deck2Index = Math.floor(Math.random() * selectedDecks.length);
        }
      }

      const deck1Id = selectedDecks[deck1Index];
      const deck2Id = selectedDecks[deck2Index];

      const deck1 = decks.find(d => d.id === deck1Id);
      const deck2 = decks.find(d => d.id === deck2Id);

      if (!deck1 || !deck2) continue;

      let hero1SimSettings: HeroSettings;
      let hero2SimSettings: HeroSettings;

      if (useFixedStats) {
        // Use fixed stats - no randomization
        hero1SimSettings = {
          health: heroSettings.health,
          mana: heroSettings.mana,
          stamina: heroSettings.stamina,
        };

        hero2SimSettings = {
          health: heroSettings.health,
          mana: heroSettings.mana,
          stamina: heroSettings.stamina,
        };
      } else {
        // Randomize hero stats with SAME multipliers for both heroes
        // This ensures fair matchups where both heroes have equal base stats
        // Health: base to base * 10
        const healthMultiplier = 1 + Math.random() * 9; // 1 to 10 (same for both)
        
        // Mana/Stamina: base to base * 10 (separate multiplier, but same for both)
        const resourceMultiplier = 1 + Math.random() * 9; // 1 to 10 (same for both)

        hero1SimSettings = {
          health: Math.floor(heroSettings.health * healthMultiplier),
          mana: Math.floor(heroSettings.mana * resourceMultiplier),
          stamina: Math.floor(heroSettings.stamina * resourceMultiplier),
        };

        hero2SimSettings = {
          health: Math.floor(heroSettings.health * healthMultiplier),
          mana: Math.floor(heroSettings.mana * resourceMultiplier),
          stamina: Math.floor(heroSettings.stamina * resourceMultiplier),
        };
      }

      const deck1Cards = deck1.cardIds.map(id => cards.find(c => c.id === id)).filter(Boolean) as Card[];
      const deck2Cards = deck2.cardIds.map(id => cards.find(c => c.id === id)).filter(Boolean) as Card[];

      // Run simulation
      const engine = new BattleEngine(
        hero1SimSettings,
        hero2SimSettings,
        deck1Cards,
        deck2Cards,
        characteristics
      );

      const finalState = engine.runFullSimulation();

      // Store result
      results.push({
        id: `sim-${i}`,
        hero1DeckId: deck1Id,
        hero2DeckId: deck2Id,
        hero1DeckName: deck1.name,
        hero2DeckName: deck2.name,
        hero1InitialSettings: hero1SimSettings,
        hero2InitialSettings: hero2SimSettings,
        winner: finalState.winner !== undefined ? finalState.winner : null,
        turns: finalState.turn,
        hero1Cards: deck1.cardIds,
        hero2Cards: deck2.cardIds,
      });

      // Update progress
      setSimulationProgress(Math.floor(((i + 1) / numSimulations) * 100));
    }
    
    // Analyze results
    const analyticsData = analyzeSimulations(results, cards);
    setAnalytics(analyticsData);
    
    // Select first card with data for chart
    if (analyticsData.cardAnalytics.length > 0) {
      setSelectedCardForChart(analyticsData.cardAnalytics[0].cardId);
    }

    // Analyze best balanced ranges
    const balancedRanges = findBestBalancedRanges(
      analyticsData,
      cards,
      5,
      5,
      heroSettings.health,
      Math.max(heroSettings.mana, heroSettings.stamina)
    );
    setBalanceRanges(balancedRanges);

    // Calculate power point suggestions
    const ppSuggestions = calculatePowerPointSuggestions(analyticsData, cards);
    setPowerPointSuggestions(ppSuggestions);

    // Calculate scaling suggestions
    const scalingSuggs = calculateScalingSuggestions(
      analyticsData,
      cards,
      balancedRanges.length > 0 ? balancedRanges[0] : null,
      characteristics
    );
    setScalingSuggestions(scalingSuggs);

    // Initialize custom stats with base values
    setCustomHealth(heroSettings.health);
    setCustomManaStamina(Math.max(heroSettings.mana, heroSettings.stamina));

    setMode('multi-results');
  };

  const analyzeCustomStats = () => {
    if (!analytics) return;
    
    const results = getCardsWinRateAtSpecificStats(
      analytics,
      cards,
      customHealth,
      customManaStamina,
      50 // tolerance
    );
    setCustomStatsResults(results);
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
            <button
              className="btn-info btn-large"
              onClick={() => setMode('multi-setup')}
            >
              📊 Множественные симуляции
            </button>
          </div>

          {decks.length < 2 && (
            <div className="warning-box">
              ⚠️ Создайте минимум 2 колоды для проведения симуляции
            </div>
          )}
        </div>
      )}

      {mode === 'multi-setup' && (
        <div className="multi-setup-container">
          <div className="multi-setup-header">
            <h2>Настройка множественных симуляций</h2>
            <button className="btn-secondary" onClick={() => setMode('setup')}>
              ← Назад
            </button>
          </div>

          <div className="multi-setup-content">
            <div className="form-group">
              <label>Количество симуляций</label>
              <input
                type="number"
                value={numSimulations}
                onChange={(e) => setNumSimulations(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="10000"
              />
              <small>Рекомендуется: 100-1000 симуляций для надежной аналитики</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={useFixedStats}
                  onChange={(e) => setUseFixedStats(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Использовать фиксированные характеристики героев
              </label>
              <small>
                {useFixedStats 
                  ? `Все симуляции будут использовать: ${heroSettings.health} HP, ${heroSettings.mana} Mana, ${heroSettings.stamina} Stamina`
                  : 'Характеристики героев будут рандомизированы для каждой симуляции'}
              </small>
            </div>

            <div className="form-group">
              <label>Выберите колоды для симуляций (минимум 2)</label>
              <div className="deck-selection-grid">
                {decks.map(deck => (
                  <div
                    key={deck.id}
                    className={`deck-selection-item ${selectedDecks.includes(deck.id) ? 'selected' : ''}`}
                    onClick={() => toggleDeckSelection(deck.id)}
                  >
                    <div className="deck-checkbox">
                      {selectedDecks.includes(deck.id) ? '✓' : ''}
                    </div>
                    <div className="deck-info">
                      <div className="deck-name">{deck.name}</div>
                      <div className="deck-card-count">{deck.cardIds.length} карт</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-box">
              <h4>ℹ️ Как работают множественные симуляции:</h4>
              <ul>
                <li>Случайный выбор колод из выбранных для каждого боя</li>
                {useFixedStats ? (
                  <>
                    <li><strong>Фиксированные характеристики:</strong> Все герои будут иметь одинаковые характеристики: {heroSettings.health} HP, {heroSettings.mana} Mana, {heroSettings.stamina} Stamina</li>
                    <li>Это позволяет проверить баланс колод при конкретных значениях характеристик героя</li>
                    <li>Идеально для точной настройки баланса карт для определенного уровня силы героя</li>
                  </>
                ) : (
                  <>
                    <li><strong>Здоровье обоих героев</strong> изменяется одинаково: от базового до базового × 10</li>
                    <li><strong>Мана и выносливость обоих героев</strong> изменяются одинаково (независимо от здоровья): от базового до базового × 10</li>
                    <li>Это обеспечивает справедливые матчи, где разница только в колодах</li>
                    <li>Базовые значения берутся из настроек героя: {heroSettings.health} HP, {heroSettings.mana} Mana, {heroSettings.stamina} Stamina</li>
                  </>
                )}
                <li>После симуляций вы получите детальную аналитику и рекомендации по балансу</li>
              </ul>
            </div>

            <button
              className="btn-success btn-large"
              onClick={startMultiSimulation}
              disabled={selectedDecks.length < 2}
            >
              🚀 Запустить {numSimulations} симуляций
            </button>
          </div>
        </div>
      )}

      {mode === 'multi-running' && (
        <div className="multi-running-container">
          <h2>Выполнение симуляций...</h2>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${simulationProgress}%` }}></div>
          </div>
          <p className="progress-text">{simulationProgress}% ({Math.floor(numSimulations * simulationProgress / 100)} / {numSimulations})</p>
        </div>
      )}

      {mode === 'multi-results' && analytics && (
        <div className="multi-results-container">
          <div className="results-header">
            <h2>📊 Результаты {analytics.totalSimulations} симуляций</h2>
            <button className="btn-secondary" onClick={() => setMode('setup')}>
              Новая симуляция
            </button>
          </div>

          {/* Summary Statistics */}
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-value">{analytics.totalSimulations}</div>
              <div className="stat-label">Всего боёв</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.cardAnalytics.length}</div>
              <div className="stat-label">Уникальных карт</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{selectedDecks.length}</div>
              <div className="stat-label">Колод</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {analytics.recommendations.filter(r => r.severity === 'high').length}
              </div>
              <div className="stat-label">Критических проблем</div>
            </div>
          </div>

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h3>🔧 Рекомендации по балансу</h3>
              {analytics.recommendations.map((rec, idx) => (
                <div key={idx} className={`recommendation-card severity-${rec.severity} issue-${rec.issue}`}>
                  <div className="recommendation-header">
                    <div className="recommendation-title">
                      {rec.issue === 'overpowered' && '⚠️'}
                      {rec.issue === 'underpowered' && '⬇️'}
                      {rec.issue === 'balanced' && 'ℹ️'}
                      <strong>{rec.cardName}</strong>
                      <span className={`severity-badge ${rec.severity}`}>
                        {rec.severity === 'high' && 'Высокая важность'}
                        {rec.severity === 'medium' && 'Средняя важность'}
                        {rec.severity === 'low' && 'Низкая важность'}
                      </span>
                    </div>
                  </div>
                  <p className="recommendation-description">{rec.description}</p>
                  <div className="recommendation-stats">
                    <span>Винрейт: {rec.winRate.toFixed(1)}%</span>
                    <span>Импакт: {rec.impactScore.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Card Analytics Table */}
          <div className="card-analytics-section">
            <h3>📈 Аналитика по картам</h3>
            <div className="analytics-table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Карта</th>
                    <th>Появлений</th>
                    <th>Побед</th>
                    <th>Поражений</th>
                    <th>Ничьих</th>
                    <th>Винрейт</th>
                    <th>Импакт</th>
                    <th>График</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.cardAnalytics.map(card => (
                    <tr key={card.cardId}>
                      <td><strong>{card.cardName}</strong></td>
                      <td>{card.totalAppearances}</td>
                      <td className="wins">{card.wins}</td>
                      <td className="losses">{card.losses}</td>
                      <td>{card.draws}</td>
                      <td>
                        <span className={`winrate ${card.winRate > 60 ? 'high' : card.winRate < 40 ? 'low' : ''}`}>
                          {card.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`impact ${card.impactScore > 15 ? 'high' : ''}`}>
                          {card.impactScore.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => setSelectedCardForChart(card.cardId)}
                        >
                          📊
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card Performance Chart */}
          {selectedCardForChart && analytics && (
            <div className="card-chart-section">
              <h3>📉 Зависимость побед от характеристик героя</h3>
              <div className="chart-card-selector">
                <label>Выбранная карта:</label>
                <select
                  value={selectedCardForChart}
                  onChange={(e) => setSelectedCardForChart(e.target.value)}
                >
                  {analytics.cardAnalytics.map(card => (
                    <option key={card.cardId} value={card.cardId}>
                      {card.cardName}
                    </option>
                  ))}
                </select>
              </div>
              
              <CardPerformanceChart
                cardId={selectedCardForChart}
                analytics={analytics}
                heroSettings={heroSettings}
              />
            </div>
          )}

          {/* Custom Stats Viewer */}
          <div className="custom-stats-section">
            <h3>🎯 Винрейт карт при конкретных характеристиках</h3>
            <p className="section-description">
              Задайте конкретные значения здоровья и маны/выносливости, чтобы увидеть винрейт каждой карты в этих условиях
            </p>
            
            <div className="custom-stats-inputs">
              <div className="stat-input-group">
                <label>❤️ Здоровье</label>
                <input
                  type="number"
                  value={customHealth}
                  onChange={(e) => setCustomHealth(parseInt(e.target.value) || 0)}
                  min="0"
                  step="10"
                />
              </div>
              
              <div className="stat-input-group">
                <label>💧⚡ Мана/Выносливость</label>
                <input
                  type="number"
                  value={customManaStamina}
                  onChange={(e) => setCustomManaStamina(parseInt(e.target.value) || 0)}
                  min="0"
                  step="10"
                />
              </div>
              
              <button
                className="btn-primary"
                onClick={analyzeCustomStats}
              >
                📊 Проанализировать
              </button>
            </div>

            {customStatsResults.length > 0 && (
              <div className="custom-stats-results">
                <h4>Результаты при HP: {customHealth}, Mana/Stamina: {customManaStamina} (±50)</h4>
                <div className="custom-stats-table-container">
                  <table className="custom-stats-table">
                    <thead>
                      <tr>
                        <th>Ранг</th>
                        <th>Карта</th>
                        <th>Винрейт</th>
                        <th>Побед/Всего</th>
                        <th>Отклонение от 50%</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customStatsResults.map((result, idx) => (
                        <tr key={result.cardId}>
                          <td className="rank">#{idx + 1}</td>
                          <td><strong>{result.cardName}</strong></td>
                          <td>
                            <span className={`winrate ${result.winRate > 60 ? 'high' : result.winRate < 40 ? 'low' : ''}`}>
                              {result.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td>{result.wins}/{result.total}</td>
                          <td>
                            <span className={`deviation ${result.deviation > 15 ? 'high' : result.deviation < 5 ? 'low' : ''}`}>
                              {result.deviation.toFixed(1)}%
                            </span>
                          </td>
                          <td>
                            {result.winRate > 60 && <span className="status overpowered">Сильная</span>}
                            {result.winRate >= 45 && result.winRate <= 55 && <span className="status balanced">Сбалансирована</span>}
                            {result.winRate < 40 && <span className="status underpowered">Слабая</span>}
                            {result.winRate > 55 && result.winRate <= 60 && <span className="status slightly-strong">Выше среднего</span>}
                            {result.winRate >= 40 && result.winRate < 45 && <span className="status slightly-weak">Ниже среднего</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Best Balanced Ranges */}
          {balanceRanges.length > 0 && (
            <div className="balance-ranges-section">
              <h3>⚖️ Лучшие диапазоны баланса</h3>
              <p className="section-description">
                Показывает диапазоны характеристик, где винрейты карт наиболее близки к 50% (лучший баланс)
              </p>
              
              <div className="balance-ranges-list">
                {balanceRanges.slice(0, 5).map((range, idx) => (
                  <div key={idx} className={`balance-range-card rank-${idx + 1}`}>
                    <div className="balance-range-header">
                      <div className="balance-rank">#{idx + 1}</div>
                      <div className="balance-range-stats">
                        <div className="range-label">
                          ❤️ HP: {Math.floor(range.healthRange[0])} - {Math.floor(range.healthRange[1])}
                        </div>
                        <div className="range-label">
                          💧 Mana/Stamina: {Math.floor(range.resourceRange[0])} - {Math.floor(range.resourceRange[1])}
                        </div>
                      </div>
                      <div className="balance-score">
                        <div className="score-value">{range.avgWinRateDeviation.toFixed(2)}%</div>
                        <div className="score-label">Среднее отклонение</div>
                      </div>
                    </div>
                    
                    <div className="balance-range-details">
                      <div className="detail-item">
                        <span className="detail-label">Боёв проведено:</span>
                        <span className="detail-value">{range.totalBattles}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Карт проанализировано:</span>
                        <span className="detail-value">{range.cardStats.length}</span>
                      </div>
                    </div>

                    {idx === 0 && (
                      <div className="best-balance-info">
                        <strong>🏆 Лучший баланс!</strong> В этом диапазоне характеристик все карты наиболее сбалансированы.
                        Рекомендуется настраивать баланс именно для этих значений.
                      </div>
                    )}

                    <details className="balance-card-details">
                      <summary>Показать детали по картам ({range.cardStats.length})</summary>
                      <div className="balance-cards-list">
                        {range.cardStats.map(cardStat => (
                          <div key={cardStat.cardId} className="balance-card-item">
                            <span className="card-name">{cardStat.cardName}</span>
                            <span className={`card-winrate ${cardStat.deviation < 5 ? 'excellent' : cardStat.deviation < 10 ? 'good' : 'fair'}`}>
                              {cardStat.winRate.toFixed(1)}%
                            </span>
                            <span className="card-deviation">
                              (откл: {cardStat.deviation.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
              
              {balanceRanges.length > 5 && (
                <div className="more-ranges-info">
                  Показаны топ-5 наиболее сбалансированных диапазонов из {balanceRanges.length}
                </div>
              )}
            </div>
          )}

          {/* Power Point Recalculation Suggestions */}
          {powerPointSuggestions.length > 0 && (
            <div className="power-points-section">
              <h3>⚖️ Предложения по перераспределению поинтов силы</h3>
              <p className="section-description">
                На основе анализа винрейтов карт, предлагается перераспределение поинтов силы для достижения лучшего баланса.
                Цель: карты с винрейтом 50% должны иметь ~0 поинтов силы.
              </p>

              <div className="power-points-table-container">
                <table className="power-points-table">
                  <thead>
                    <tr>
                      <th>Карта</th>
                      <th>Текущие PP</th>
                      <th>Предложенные PP</th>
                      <th>Изменение</th>
                      <th>Винрейт</th>
                      <th>Обоснование</th>
                    </tr>
                  </thead>
                  <tbody>
                    {powerPointSuggestions.map(suggestion => (
                      <tr key={suggestion.cardId}>
                        <td><strong>{suggestion.cardName}</strong></td>
                        <td className="pp-value">{suggestion.currentPowerPoints.toFixed(1)}</td>
                        <td className="pp-value suggested">{suggestion.suggestedPowerPoints.toFixed(1)}</td>
                        <td>
                          <span className={`pp-adjustment ${suggestion.adjustment > 0 ? 'increase' : 'decrease'}`}>
                            {suggestion.adjustment > 0 ? '+' : ''}{suggestion.adjustment.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <span className={`winrate ${suggestion.winRate > 60 ? 'high' : suggestion.winRate < 40 ? 'low' : ''}`}>
                            {suggestion.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="reason">{suggestion.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="info-box">
                <p><strong>💡 Как применить:</strong></p>
                <ul>
                  <li>Перейдите на страницу "Характеристики"</li>
                  <li>Измените поинты силы характеристик карт согласно предложениям</li>
                  <li>Карты с высоким винрейтом должны стать дороже (больше поинтов силы)</li>
                  <li>Карты с низким винрейтом должны стать дешевле (меньше поинтов силы)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Scaling Suggestions */}
          {scalingSuggestions.length > 0 && scalingSuggestions[0].cardAdjustments.length > 0 && (
            <div className="scaling-section">
              <h3>🎯 Рекомендации по идеальному балансу системы</h3>
              <p className="section-description">
                Комплексные рекомендации по настройке здоровья, ресурсов и силы карт для достижения идеального баланса.
              </p>

              {scalingSuggestions.map((suggestion, idx) => (
                <div key={idx} className="scaling-suggestion">
                  <div className="scaling-header">
                    <h4>🎮 Идеальные параметры героя</h4>
                    <div className="scaling-values">
                      <div className="scaling-stat">
                        <span className="stat-label">❤️ Здоровье:</span>
                        <span className="stat-value">{suggestion.targetHealth}</span>
                      </div>
                      <div className="scaling-stat">
                        <span className="stat-label">💧 Мана:</span>
                        <span className="stat-value">{suggestion.targetMana}</span>
                      </div>
                      <div className="scaling-stat">
                        <span className="stat-label">⚡ Выносливость:</span>
                        <span className="stat-value">{suggestion.targetStamina}</span>
                      </div>
                    </div>
                  </div>

                  <p className="scaling-description">{suggestion.description}</p>

                  <div className="scaling-details">
                    <h5>📋 Корректировки поинтов силы карт:</h5>
                    <div className="scaling-cards-table-container">
                      <table className="scaling-cards-table">
                        <thead>
                          <tr>
                            <th>Карта</th>
                            <th>Текущие PP</th>
                            <th>Новые PP</th>
                            <th>Изменение</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suggestion.cardAdjustments.map(adj => (
                            <tr key={adj.cardId}>
                              <td><strong>{adj.cardName}</strong></td>
                              <td>{adj.currentPowerPoints.toFixed(1)}</td>
                              <td className="suggested-value">{adj.scaledPowerPoints.toFixed(1)}</td>
                              <td>
                                <span className={`adjustment ${adj.scaledPowerPoints > adj.currentPowerPoints ? 'increase' : 'decrease'}`}>
                                  {adj.scaledPowerPoints > adj.currentPowerPoints ? '+' : ''}
                                  {(adj.scaledPowerPoints - adj.currentPowerPoints).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="info-box">
                    <p><strong>🚀 Пошаговая инструкция:</strong></p>
                    <ol>
                      <li><strong>Настройте героя:</strong> Перейдите в "Настройки героя" и установите здоровье на {suggestion.targetHealth}, ману на {suggestion.targetMana}, выносливость на {suggestion.targetStamina}</li>
                      <li><strong>Обновите карты:</strong> Измените поинты силы карт согласно таблице выше</li>
                      <li><strong>Проверьте баланс:</strong> Запустите новые симуляции с фиксированными характеристиками для проверки</li>
                      <li><strong>Итеративно улучшайте:</strong> При необходимости повторите анализ и внесите дополнительные корректировки</li>
                    </ol>
                  </div>
                </div>
              ))}
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
