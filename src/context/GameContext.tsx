import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Characteristic, Card, Deck, HeroSettings } from '../types';

interface GameContextType {
  characteristics: Characteristic[];
  cards: Card[];
  decks: Deck[];
  heroSettings: HeroSettings;
  addCharacteristic: (characteristic: Characteristic) => void;
  updateCharacteristic: (id: string, characteristic: Characteristic) => void;
  deleteCharacteristic: (id: string) => void;
  addCard: (card: Card) => void;
  updateCard: (id: string, card: Card) => void;
  deleteCard: (id: string) => void;
  addDeck: (deck: Deck) => void;
  updateDeck: (id: string, deck: Deck) => void;
  deleteDeck: (id: string) => void;
  updateHeroSettings: (settings: HeroSettings) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = 'ccg-balance-tool-data';

const defaultHeroSettings: HeroSettings = {
  health: 100,
  mana: 50,
  stamina: 50,
};

interface StoredData {
  characteristics: Characteristic[];
  cards: Card[];
  decks: Deck[];
  heroSettings: HeroSettings;
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultHeroSettings);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored);
        setCharacteristics(data.characteristics || []);
        setCards(data.cards || []);
        setDecks(data.decks || []);
        setHeroSettings(data.heroSettings || defaultHeroSettings);
      } catch (e) {
        console.error('Failed to load data from localStorage', e);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    const data: StoredData = {
      characteristics,
      cards,
      decks,
      heroSettings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [characteristics, cards, decks, heroSettings]);

  const addCharacteristic = (characteristic: Characteristic) => {
    setCharacteristics([...characteristics, characteristic]);
  };

  const updateCharacteristic = (id: string, characteristic: Characteristic) => {
    setCharacteristics(characteristics.map(c => c.id === id ? characteristic : c));
  };

  const deleteCharacteristic = (id: string) => {
    setCharacteristics(characteristics.filter(c => c.id !== id));
  };

  const addCard = (card: Card) => {
    setCards([...cards, card]);
  };

  const updateCard = (id: string, card: Card) => {
    setCards(cards.map(c => c.id === id ? card : c));
  };

  const deleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const addDeck = (deck: Deck) => {
    setDecks([...decks, deck]);
  };

  const updateDeck = (id: string, deck: Deck) => {
    setDecks(decks.map(d => d.id === id ? deck : d));
  };

  const deleteDeck = (id: string) => {
    setDecks(decks.filter(d => d.id !== id));
  };

  const updateHeroSettings = (settings: HeroSettings) => {
    setHeroSettings(settings);
  };

  return (
    <GameContext.Provider
      value={{
        characteristics,
        cards,
        decks,
        heroSettings,
        addCharacteristic,
        updateCharacteristic,
        deleteCharacteristic,
        addCard,
        updateCard,
        deleteCard,
        addDeck,
        updateDeck,
        deleteDeck,
        updateHeroSettings,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
