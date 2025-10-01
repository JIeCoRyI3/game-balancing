import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Characteristic, ActionBlock, ActionType } from '../types';
import './CharacteristicsPage.css';

const actionTypeLabels: Record<ActionType, string> = {
  [ActionType.DAMAGE_ENEMY]: 'Урон врагу',
  [ActionType.HEAL_ENEMY]: 'Хил врагу',
  [ActionType.DAMAGE_SELF]: 'Урон себе',
  [ActionType.HEAL_SELF]: 'Хил себе',
  [ActionType.SPEND_MANA_SELF]: 'Трата маны (своя)',
  [ActionType.SPEND_MANA_ENEMY]: 'Трата маны (врага)',
  [ActionType.RESTORE_MANA_ENEMY]: 'Восстановление маны (врага)',
  [ActionType.RESTORE_MANA_SELF]: 'Восстановление маны (своя)',
  [ActionType.SPEND_STAMINA_SELF]: 'Трата выносливости (своя)',
  [ActionType.SPEND_STAMINA_ENEMY]: 'Трата выносливости (врага)',
  [ActionType.RESTORE_STAMINA_SELF]: 'Восстановление выносливости (своя)',
  [ActionType.RESTORE_STAMINA_ENEMY]: 'Восстановление выносливости (врага)',
  [ActionType.EFFECT_DURATION]: 'Длительность эффекта (0 = мгновенно)',
  [ActionType.COOLDOWN]: 'Перезарядка (в ходах)',
  [ActionType.DISCARD_CARD]: 'Сбросить карту',
  [ActionType.GLOBAL_MISS_CHANCE_SELF]: 'Общий Шанс промаха свой (%)',
  [ActionType.GLOBAL_MISS_CHANCE_ENEMY]: 'Общий Шанс промаха противника (%)',
  [ActionType.GLOBAL_CRIT_CHANCE_SELF]: 'Общий Шанс крита свой (%)',
  [ActionType.GLOBAL_CRIT_CHANCE_ENEMY]: 'Общий Шанс крита противника (%)',
  [ActionType.GLOBAL_CRIT_SIZE_SELF]: 'Общий Размер крита свой (%)',
  [ActionType.GLOBAL_CRIT_SIZE_ENEMY]: 'Общий Размер крита противника (%)',
  [ActionType.CARD_CRIT_CHANCE]: 'Шанс крита карты (%)',
  [ActionType.CARD_CRIT_SIZE]: 'Размер крита карты (%)',
  [ActionType.CARD_MISS_CHANCE]: 'Шанс промаха карты (%)',
};

function CharacteristicsPage() {
  const { characteristics, addCharacteristic, updateCharacteristic, deleteCharacteristic } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [editingChar, setEditingChar] = useState<Characteristic | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'positive' as 'positive' | 'negative',
    powerPoints: 0,
    description: '',
    actions: [] as ActionBlock[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'positive',
      powerPoints: 0,
      description: '',
      actions: [],
    });
    setEditingChar(null);
  };

  const openModal = (char?: Characteristic) => {
    if (char) {
      setEditingChar(char);
      setFormData({
        name: char.name,
        type: char.type,
        powerPoints: char.powerPoints,
        description: char.description || '',
        actions: [...char.actions],
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(resetForm, 300);
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { id: Date.now().toString(), type: ActionType.DAMAGE_ENEMY, value: 0 },
      ],
    });
  };

  const updateAction = (index: number, field: 'type' | 'value', value: any) => {
    const newActions = [...formData.actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Пожалуйста, введите название характеристики');
      return;
    }

    const characteristic: Characteristic = {
      id: editingChar?.id || Date.now().toString(),
      name: formData.name,
      type: formData.type,
      powerPoints: formData.powerPoints,
      description: formData.description,
      actions: formData.actions,
    };

    if (editingChar) {
      updateCharacteristic(editingChar.id, characteristic);
    } else {
      addCharacteristic(characteristic);
    }

    closeModal();
  };

  return (
    <div className="characteristics-page">
      <div className="page-header">
        <h1>Характеристики</h1>
        <p>Создайте позитивные и негативные характеристики для карт</p>
      </div>

      <div className="page-actions">
        <button className="btn-primary" onClick={() => openModal()}>
          + Добавить характеристику
        </button>
      </div>

      {characteristics.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Нет характеристик</h3>
          <p>Создайте первую характеристику для начала работы</p>
        </div>
      ) : (
        <div className="characteristics-list">
          {characteristics.map((char) => (
            <div key={char.id} className="list-item">
              <div className="list-item-header">
                <div>
                  <div className="list-item-title">
                    {char.name}
                    <span className={`badge badge-${char.type}`}>
                      {char.type === 'positive' ? 'Позитивная' : 'Негативная'}
                    </span>
                  </div>
                  {char.description && (
                    <p className="char-description">{char.description}</p>
                  )}
                </div>
                <div className="list-item-actions">
                  <button className="btn-secondary btn-small" onClick={() => openModal(char)}>
                    Изменить
                  </button>
                  <button
                    className="btn-danger btn-small"
                    onClick={() => {
                      if (confirm('Удалить эту характеристику?')) {
                        deleteCharacteristic(char.id);
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>

              <div className="char-stats">
                <div className="char-stat">
                  <span className="char-stat-label">Поинты Силы:</span>
                  <span className={`char-stat-value ${char.powerPoints >= 0 ? 'positive' : 'negative'}`}>
                    {char.powerPoints > 0 ? '+' : ''}{char.powerPoints}
                  </span>
                </div>
              </div>

              {char.actions.length > 0 && (
                <div className="char-actions">
                  <strong>Действия:</strong>
                  <div className="actions-list">
                    {char.actions.map((action) => (
                      <div key={action.id} className="action-item">
                        {actionTypeLabels[action.type]}: <strong>{action.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingChar ? 'Изменить характеристику' : 'Новая характеристика'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Атака, Здоровье, Мана"
                  required
                />
              </div>

              <div className="form-group">
                <label>Тип</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'positive' | 'negative' })}
                >
                  <option value="positive">Позитивная</option>
                  <option value="negative">Негативная</option>
                </select>
              </div>

              <div className="form-group">
                <label>Поинты Силы (может быть отрицательным)</label>
                <input
                  type="number"
                  value={formData.powerPoints}
                  onChange={(e) => setFormData({ ...formData, powerPoints: parseFloat(e.target.value) })}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Описание (опционально)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание характеристики"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Конструктор действий</label>
                <p className="help-text">Определите, что делает эта характеристика</p>
                
                <div className="actions-constructor">
                  {formData.actions.map((action, index) => (
                    <div key={action.id} className="action-block">
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                      >
                        {Object.entries(actionTypeLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={action.value}
                        onChange={(e) => updateAction(index, 'value', parseFloat(e.target.value))}
                        placeholder="Значение"
                        step="0.1"
                      />
                      <button
                        type="button"
                        className="btn-danger btn-small"
                        onClick={() => removeAction(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn-secondary" onClick={addAction}>
                    + Добавить действие
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  {editingChar ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacteristicsPage;
