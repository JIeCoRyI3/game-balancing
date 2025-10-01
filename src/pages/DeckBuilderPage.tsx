import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Deck } from '../types';
import './DeckBuilderPage.css';

function DeckBuilderPage() {
  const { cards, decks, addDeck, updateDeck, deleteDeck } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cardIds: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      cardIds: [],
    });
    setEditingDeck(null);
  };

  const openModal = (deck?: Deck) => {
    if (deck) {
      setEditingDeck(deck);
      setFormData({
        name: deck.name,
        cardIds: [...deck.cardIds],
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

  const addCardToDeck = (cardId: string) => {
    setFormData({
      ...formData,
      cardIds: [...formData.cardIds, cardId],
    });
  };

  const removeCardFromDeck = (index: number) => {
    setFormData({
      ...formData,
      cardIds: formData.cardIds.filter((_, i) => i !== index),
    });
  };

  const calculateDeckStats = (cardIds: string[]) => {
    const totalPower = cardIds.reduce((sum, cardId) => {
      const card = cards.find((c) => c.id === cardId);
      return sum + (card?.totalPowerPoints || 0);
    }, 0);

    const cardCount = cardIds.length;
    const avgPower = cardCount > 0 ? totalPower / cardCount : 0;

    return { totalPower, cardCount, avgPower };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Пожалуйста, введите название колоды');
      return;
    }

    if (formData.cardIds.length === 0) {
      alert('Добавьте хотя бы одну карту в колоду');
      return;
    }

    const deck: Deck = {
      id: editingDeck?.id || Date.now().toString(),
      name: formData.name,
      cardIds: formData.cardIds,
    };

    if (editingDeck) {
      updateDeck(editingDeck.id, deck);
    } else {
      addDeck(deck);
    }

    closeModal();
  };

  return (
    <div className="deck-builder-page">
      <div className="page-header">
        <h1>Сборка Колоды</h1>
        <p>Создавайте колоды из существующих карт для симуляции боя</p>
      </div>

      <div className="page-actions">
        <button
          className="btn-primary"
          onClick={() => openModal()}
          disabled={cards.length === 0}
        >
          + Создать колоду
        </button>
        {cards.length === 0 && (
          <span className="help-text">Сначала создайте карты!</span>
        )}
      </div>

      {decks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>Нет колод</h3>
          <p>Создайте колоду для проведения симуляций боя</p>
        </div>
      ) : (
        <div className="decks-list">
          {decks.map((deck) => {
            const stats = calculateDeckStats(deck.cardIds);
            const cardCounts = deck.cardIds.reduce((acc, cardId) => {
              acc[cardId] = (acc[cardId] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            return (
              <div key={deck.id} className="deck-item">
                <div className="deck-header">
                  <div>
                    <h3>{deck.name}</h3>
                    <div className="deck-stats">
                      <span className="deck-stat">
                        <strong>{stats.cardCount}</strong> карт
                      </span>
                      <span className="deck-stat">
                        Средняя сила: <strong>{stats.avgPower.toFixed(1)}</strong>
                      </span>
                      <span className="deck-stat">
                        Общая сила: <strong className={stats.totalPower >= 0 ? 'positive' : 'negative'}>
                          {stats.totalPower > 0 ? '+' : ''}{stats.totalPower.toFixed(1)}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="deck-actions">
                    <button className="btn-secondary btn-small" onClick={() => openModal(deck)}>
                      Изменить
                    </button>
                    <button
                      className="btn-danger btn-small"
                      onClick={() => {
                        if (confirm('Удалить эту колоду?')) {
                          deleteDeck(deck.id);
                        }
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="deck-cards">
                  {Object.entries(cardCounts).map(([cardId, count]) => {
                    const card = cards.find((c) => c.id === cardId);
                    if (!card) return null;
                    return (
                      <div key={cardId} className="deck-card">
                        <span className="deck-card-name">{card.name}</span>
                        {count > 1 && <span className="deck-card-count">×{count}</span>}
                        <span className={`deck-card-power ${card.totalPowerPoints >= 0 ? 'positive' : 'negative'}`}>
                          {card.totalPowerPoints > 0 ? '+' : ''}{card.totalPowerPoints.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDeck ? 'Изменить колоду' : 'Новая колода'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название колоды</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Агрессивная, Контроль, Комбо"
                  required
                />
              </div>

              <div className="deck-builder">
                <div className="available-cards">
                  <h3>Доступные карты</h3>
                  <div className="cards-list">
                    {cards.map((card) => (
                      <div key={card.id} className="available-card" onClick={() => addCardToDeck(card.id)}>
                        <span className="card-name">{card.name}</span>
                        <span className={`card-power ${card.totalPowerPoints >= 0 ? 'positive' : 'negative'}`}>
                          {card.totalPowerPoints > 0 ? '+' : ''}{card.totalPowerPoints.toFixed(1)}
                        </span>
                        <button type="button" className="btn-small btn-primary">+</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="deck-contents">
                  <h3>Карты в колоде ({formData.cardIds.length})</h3>
                  {formData.cardIds.length === 0 ? (
                    <div className="empty-deck">
                      <p>Кликните на карты слева для добавления</p>
                    </div>
                  ) : (
                    <div className="deck-cards-list">
                      {formData.cardIds.map((cardId, index) => {
                        const card = cards.find((c) => c.id === cardId);
                        if (!card) return null;
                        return (
                          <div key={index} className="deck-card-item">
                            <span className="card-name">{card.name}</span>
                            <span className={`card-power ${card.totalPowerPoints >= 0 ? 'positive' : 'negative'}`}>
                              {card.totalPowerPoints > 0 ? '+' : ''}{card.totalPowerPoints.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              className="btn-small btn-danger"
                              onClick={() => removeCardFromDeck(index)}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {formData.cardIds.length > 0 && (
                    <div className="deck-stats-preview">
                      {(() => {
                        const stats = calculateDeckStats(formData.cardIds);
                        return (
                          <>
                            <div className="stat-item">
                              <span>Средняя сила:</span>
                              <strong>{stats.avgPower.toFixed(1)}</strong>
                            </div>
                            <div className="stat-item">
                              <span>Общая сила:</span>
                              <strong className={stats.totalPower >= 0 ? 'positive' : 'negative'}>
                                {stats.totalPower > 0 ? '+' : ''}{stats.totalPower.toFixed(1)}
                              </strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  {editingDeck ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckBuilderPage;
