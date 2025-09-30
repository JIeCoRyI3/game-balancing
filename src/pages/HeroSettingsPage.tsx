import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './HeroSettingsPage.css';

function HeroSettingsPage() {
  const { heroSettings, updateHeroSettings } = useGame();
  const [formData, setFormData] = useState(heroSettings);

  useEffect(() => {
    setFormData(heroSettings);
  }, [heroSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHeroSettings(formData);
    alert('Настройки героя сохранены!');
  };

  const handleChange = (field: keyof typeof formData, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="hero-settings-page">
      <div className="page-header">
        <h1>Настройки Героя</h1>
        <p>Установите базовые параметры здоровья, маны и выносливости для героев</p>
      </div>

      <div className="settings-container">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="stats-preview">
            <div className="stat-preview-card health">
              <div className="stat-icon">❤️</div>
              <div className="stat-info">
                <div className="stat-label">Здоровье</div>
                <div className="stat-value">{formData.health}</div>
              </div>
            </div>

            <div className="stat-preview-card mana">
              <div className="stat-icon">💧</div>
              <div className="stat-info">
                <div className="stat-label">Мана</div>
                <div className="stat-value">{formData.mana}</div>
              </div>
            </div>

            <div className="stat-preview-card stamina">
              <div className="stat-icon">⚡</div>
              <div className="stat-info">
                <div className="stat-label">Выносливость</div>
                <div className="stat-value">{formData.stamina}</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="health">
              Здоровье (HP)
              <span className="label-hint">Базовое здоровье героя</span>
            </label>
            <div className="slider-container">
              <input
                id="health"
                type="range"
                min="10"
                max="500"
                step="10"
                value={formData.health}
                onChange={(e) => handleChange('health', parseInt(e.target.value))}
                className="slider"
              />
              <input
                type="number"
                value={formData.health}
                onChange={(e) => handleChange('health', parseInt(e.target.value))}
                className="number-input"
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="mana">
              Мана
              <span className="label-hint">Используется для активации карт</span>
            </label>
            <div className="slider-container">
              <input
                id="mana"
                type="range"
                min="0"
                max="200"
                step="5"
                value={formData.mana}
                onChange={(e) => handleChange('mana', parseInt(e.target.value))}
                className="slider"
              />
              <input
                type="number"
                value={formData.mana}
                onChange={(e) => handleChange('mana', parseInt(e.target.value))}
                className="number-input"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="stamina">
              Выносливость
              <span className="label-hint">Используется для физических действий</span>
            </label>
            <div className="slider-container">
              <input
                id="stamina"
                type="range"
                min="0"
                max="200"
                step="5"
                value={formData.stamina}
                onChange={(e) => handleChange('stamina', parseInt(e.target.value))}
                className="slider"
              />
              <input
                type="number"
                value={formData.stamina}
                onChange={(e) => handleChange('stamina', parseInt(e.target.value))}
                className="number-input"
                min="0"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-large">
            Сохранить настройки
          </button>
        </form>

        <div className="settings-info">
          <div className="info-card">
            <h3>💡 Подсказка</h3>
            <p>
              Эти настройки определяют базовые параметры героев в симуляции боя.
              Вы сможете настроить их отдельно для каждого героя при запуске симуляции.
            </p>
          </div>

          <div className="info-card">
            <h3>⚖️ Рекомендации</h3>
            <ul>
              <li>Здоровье: 50-200 для быстрых боев, 200-500 для длинных</li>
              <li>Мана: Зависит от стоимости ваших карт</li>
              <li>Выносливость: Обычно равна или меньше маны</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSettingsPage;
