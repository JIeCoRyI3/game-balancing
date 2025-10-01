import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Card, CardCharacteristic } from '../types';
import './CardCreationPage.css';

function CardCreationPage() {
  const { characteristics, cards, addCard, updateCard, deleteCard } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    characteristics: [] as CardCharacteristic[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      characteristics: [],
    });
    setEditingCard(null);
  };

  const openModal = (card?: Card) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        name: card.name,
        description: card.description,
        characteristics: [...card.characteristics],
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

  const addCharacteristic = () => {
    if (characteristics.length === 0) {
      alert('Сначала создайте характеристики на соответствующей странице!');
      return;
    }
    setFormData({
      ...formData,
      characteristics: [
        ...formData.characteristics,
        { characteristicId: characteristics[0].id, value: 1 },
      ],
    });
  };

  const updateCharacteristic = (index: number, field: 'characteristicId' | 'value', value: any) => {
    const newChars = [...formData.characteristics];
    newChars[index] = { ...newChars[index], [field]: value };
    setFormData({ ...formData, characteristics: newChars });
  };

  const removeCharacteristic = (index: number) => {
    setFormData({
      ...formData,
      characteristics: formData.characteristics.filter((_, i) => i !== index),
    });
  };

  const calculateTotalPowerPoints = (): number => {
    return formData.characteristics.reduce((total, cardChar) => {
      const char = characteristics.find((c) => c.id === cardChar.characteristicId);
      if (!char) return total;
      return total + char.powerPoints * cardChar.value;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Пожалуйста, введите название карты');
      return;
    }

    const totalPowerPoints = calculateTotalPowerPoints();

    const card: Card = {
      id: editingCard?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      characteristics: formData.characteristics,
      totalPowerPoints,
    };

    if (editingCard) {
      updateCard(editingCard.id, card);
    } else {
      addCard(card);
    }

    closeModal();
  };

  return (
    <div className="card-creation-page">
      <div className="page-header">
        <h1>Создание Карт</h1>
        <p>Создавайте карты, комбинируя различные характеристики</p>
      </div>

      <div className="page-actions">
        <button className="btn-primary" onClick={() => openModal()}>
          + Создать карту
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🃏</div>
          <h3>Нет карт</h3>
          <p>Создайте первую карту для начала балансировки</p>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map((card) => (
            <div key={card.id} className="card-item">
              <div className="card-header">
                <h3>{card.name}</h3>
                <div className="card-power">
                  <span className={`power-value ${card.totalPowerPoints >= 0 ? 'positive' : 'negative'}`}>
                    {card.totalPowerPoints > 0 ? '+' : ''}{card.totalPowerPoints.toFixed(1)}
                  </span>
                  <span className="power-label">Поинты</span>
                </div>
              </div>

              {card.description && (
                <p className="card-description">{card.description}</p>
              )}

              <div className="card-characteristics">
                {card.characteristics.map((cardChar, idx) => {
                  const char = characteristics.find((c) => c.id === cardChar.characteristicId);
                  if (!char) return null;
                  return (
                    <div key={idx} className="card-char">
                      <span className={`char-badge ${char.type}`}>
                        {char.name}
                      </span>
                      <span className="char-value">×{cardChar.value}</span>
                      <span className="char-points">
                        ({char.powerPoints * cardChar.value > 0 ? '+' : ''}{(char.powerPoints * cardChar.value).toFixed(1)})
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="card-actions">
                <button className="btn-secondary btn-small" onClick={() => openModal(card)}>
                  Изменить
                </button>
                <button
                  className="btn-danger btn-small"
                  onClick={() => {
                    if (confirm('Удалить эту карту?')) {
                      deleteCard(card.id);
                    }
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCard ? 'Изменить карту' : 'Новая карта'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название карты"
                  required
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание эффекта карты"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Характеристики</label>
                <div className="characteristics-builder">
                  {formData.characteristics.map((cardChar, index) => (
                    <div key={index} className="char-builder-item">
                      <select
                        value={cardChar.characteristicId}
                        onChange={(e) => updateCharacteristic(index, 'characteristicId', e.target.value)}
                      >
                        {characteristics.map((char) => (
                          <option key={char.id} value={char.id}>
                            {char.name} ({char.powerPoints > 0 ? '+' : ''}{char.powerPoints})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={cardChar.value}
                        onChange={(e) => updateCharacteristic(index, 'value', parseFloat(e.target.value))}
                        placeholder="Значение"
                        min="0"
                        step="0.1"
                      />
                      <button
                        type="button"
                        className="btn-danger btn-small"
                        onClick={() => removeCharacteristic(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addCharacteristic}
                    disabled={characteristics.length === 0}
                  >
                    + Добавить характеристику
                  </button>
                </div>
              </div>

              <div className="power-preview">
                <div className="power-preview-label">Общая сила карты:</div>
                <div className={`power-preview-value ${calculateTotalPowerPoints() >= 0 ? 'positive' : 'negative'}`}>
                  {calculateTotalPowerPoints() > 0 ? '+' : ''}{calculateTotalPowerPoints().toFixed(1)} Поинтов
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  {editingCard ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardCreationPage;
