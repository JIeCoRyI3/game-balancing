// Action blocks for characteristic constructor
export enum ActionType {
  DAMAGE_ENEMY = 'damage_enemy',
  HEAL_ENEMY = 'heal_enemy',
  DAMAGE_SELF = 'damage_self',
  HEAL_SELF = 'heal_self',
  SPEND_MANA_SELF = 'spend_mana_self',
  SPEND_MANA_ENEMY = 'spend_mana_enemy',
  RESTORE_MANA_ENEMY = 'restore_mana_enemy',
  RESTORE_MANA_SELF = 'restore_mana_self',
  SPEND_STAMINA_SELF = 'spend_stamina_self',
  SPEND_STAMINA_ENEMY = 'spend_stamina_enemy',
  RESTORE_STAMINA_SELF = 'restore_stamina_self',
  RESTORE_STAMINA_ENEMY = 'restore_stamina_enemy',
  EFFECT_DURATION = 'effect_duration', // 0 = one-time effect
  COOLDOWN = 'cooldown', // in turns
  DRAW_CARD = 'draw_card',
  DISCARD_CARD = 'discard_card',
  SHIELD_SELF = 'shield_self',
  SHIELD_ENEMY = 'shield_enemy',
}

export interface ActionBlock {
  id: string;
  type: ActionType;
  value: number;
}

export interface Characteristic {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  powerPoints: number; // Can be positive or negative
  actions: ActionBlock[]; // What this characteristic does
  description?: string;
}

export interface CardCharacteristic {
  characteristicId: string;
  value: number; // The numeric value for this characteristic on this card
}

export interface Card {
  id: string;
  name: string;
  description: string;
  characteristics: CardCharacteristic[];
  totalPowerPoints: number; // Calculated from characteristics
}

export interface Deck {
  id: string;
  name: string;
  cardIds: string[]; // Can contain duplicates
}

export interface HeroSettings {
  health: number;
  mana: number;
  stamina: number;
}

export interface HeroState extends HeroSettings {
  currentHealth: number;
  currentMana: number;
  currentStamina: number;
  shield: number;
  activeEffects: ActiveEffect[];
}

export interface ActiveEffect {
  cardId: string;
  cardName: string;
  remainingDuration: number;
  actions: ActionBlock[];
}

export interface BattleState {
  turn: number;
  hero1: HeroState;
  hero2: HeroState;
  hero1Deck: string[]; // Card IDs
  hero2Deck: string[]; // Card IDs
  hero1Hand: string[];
  hero2Hand: string[];
  hero1Played: string[]; // Cards played this turn
  hero2Played: string[]; // Cards played this turn
  cooldowns1: Map<string, number>; // Card ID -> turns remaining
  cooldowns2: Map<string, number>;
  log: BattleLogEntry[];
  winner?: 1 | 2 | null;
}

export interface BattleLogEntry {
  turn: number;
  message: string;
  details?: any;
}

export interface BattleSimulation {
  id: string;
  name: string;
  hero1DeckId: string;
  hero2DeckId: string;
  hero1Settings: HeroSettings;
  hero2Settings: HeroSettings;
  result?: BattleResult;
}

export interface BattleResult {
  turns: number;
  winner: 1 | 2 | null;
  log: BattleLogEntry[];
  finalState: BattleState;
}
