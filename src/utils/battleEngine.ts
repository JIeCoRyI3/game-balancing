import {
  BattleState,
  HeroState,
  Card,
  Characteristic,
  ActionBlock,
  ActionType,
  HeroSettings,
  ActiveEffect,
} from '../types';

export class BattleEngine {
  private state: BattleState;
  private cards: Card[];
  private characteristics: Characteristic[];
  private consecutiveTurnsWithoutCards: number = 0;

  constructor(
    hero1Settings: HeroSettings,
    hero2Settings: HeroSettings,
    hero1DeckCards: Card[],
    hero2DeckCards: Card[],
    characteristics: Characteristic[]
  ) {
    this.cards = [...hero1DeckCards, ...hero2DeckCards];
    this.characteristics = characteristics;

    const hero1: HeroState = {
      ...hero1Settings,
      currentHealth: hero1Settings.health,
      currentMana: hero1Settings.mana,
      currentStamina: hero1Settings.stamina,
      shield: 0,
      activeEffects: [],
    };

    const hero2: HeroState = {
      ...hero2Settings,
      currentHealth: hero2Settings.health,
      currentMana: hero2Settings.mana,
      currentStamina: hero2Settings.stamina,
      shield: 0,
      activeEffects: [],
    };

    this.state = {
      turn: 0,
      hero1,
      hero2,
      hero1Deck: hero1DeckCards.map(c => c.id),
      hero2Deck: hero2DeckCards.map(c => c.id),
      hero1Hand: [],
      hero2Hand: [],
      hero1Played: [],
      hero2Played: [],
      cooldowns1: new Map(),
      cooldowns2: new Map(),
      log: [{ turn: 0, message: 'Battle started!' }],
      winner: undefined,
    };

    // Heroes start with all cards - no drawing
    this.log(`Hero 1 starts with ${hero1DeckCards.length} cards`);
    this.log(`Hero 2 starts with ${hero2DeckCards.length} cards`);
  }

  private log(message: string, details?: any) {
    this.state.log.push({ turn: this.state.turn, message, details });
  }

  private getCard(cardId: string): Card | undefined {
    return this.cards.find(c => c.id === cardId);
  }

  private getCharacteristic(charId: string): Characteristic | undefined {
    return this.characteristics.find(c => c.id === charId);
  }


  private applyAction(
    action: ActionBlock,
    attacker: HeroState,
    defender: HeroState,
    cardName: string
  ) {
    const value = action.value;

    switch (action.type) {
      case ActionType.DAMAGE_ENEMY:
        const damageToDefender = Math.max(0, value - defender.shield);
        defender.shield = Math.max(0, defender.shield - value);
        defender.currentHealth -= damageToDefender;
        this.log(`${cardName}: Deals ${value} damage to enemy (${damageToDefender} after shield)`);
        break;

      case ActionType.HEAL_ENEMY:
        defender.currentHealth = Math.min(defender.health, defender.currentHealth + value);
        this.log(`${cardName}: Heals enemy for ${value}`);
        break;

      case ActionType.DAMAGE_SELF:
        const damageToSelf = Math.max(0, value - attacker.shield);
        attacker.shield = Math.max(0, attacker.shield - value);
        attacker.currentHealth -= damageToSelf;
        this.log(`${cardName}: Deals ${value} damage to self (${damageToSelf} after shield)`);
        break;

      case ActionType.HEAL_SELF:
        attacker.currentHealth = Math.min(attacker.health, attacker.currentHealth + value);
        this.log(`${cardName}: Heals self for ${value}`);
        break;

      case ActionType.SPEND_MANA_SELF:
        attacker.currentMana = Math.max(0, attacker.currentMana - value);
        this.log(`${cardName}: Spends ${value} mana`);
        break;

      case ActionType.SPEND_MANA_ENEMY:
        defender.currentMana = Math.max(0, defender.currentMana - value);
        this.log(`${cardName}: Enemy spends ${value} mana`);
        break;

      case ActionType.RESTORE_MANA_ENEMY:
        defender.currentMana = Math.min(defender.mana, defender.currentMana + value);
        this.log(`${cardName}: Restores ${value} mana to enemy`);
        break;

      case ActionType.RESTORE_MANA_SELF:
        attacker.currentMana = Math.min(attacker.mana, attacker.currentMana + value);
        this.log(`${cardName}: Restores ${value} mana to self`);
        break;

      case ActionType.SPEND_STAMINA_SELF:
        attacker.currentStamina = Math.max(0, attacker.currentStamina - value);
        this.log(`${cardName}: Spends ${value} stamina`);
        break;

      case ActionType.SPEND_STAMINA_ENEMY:
        defender.currentStamina = Math.max(0, defender.currentStamina - value);
        this.log(`${cardName}: Enemy spends ${value} stamina`);
        break;

      case ActionType.RESTORE_STAMINA_SELF:
        attacker.currentStamina = Math.min(attacker.stamina, attacker.currentStamina + value);
        this.log(`${cardName}: Restores ${value} stamina to self`);
        break;

      case ActionType.RESTORE_STAMINA_ENEMY:
        defender.currentStamina = Math.min(defender.stamina, defender.currentStamina + value);
        this.log(`${cardName}: Restores ${value} stamina to enemy`);
        break;

      case ActionType.SHIELD_SELF:
        attacker.shield += value;
        this.log(`${cardName}: Gains ${value} shield`);
        break;

      case ActionType.SHIELD_ENEMY:
        defender.shield += value;
        this.log(`${cardName}: Enemy gains ${value} shield`);
        break;

      case ActionType.DRAW_CARD:
        // Draw cards is handled separately
        break;

      case ActionType.DISCARD_CARD:
        // Discard is handled separately
        break;
    }
  }

  private canPlayCard(card: Card, hero: HeroState): boolean {
    // Check if hero has enough resources to play the card
    let requiredMana = 0;
    let requiredStamina = 0;

    for (const charRef of card.characteristics) {
      const char = this.getCharacteristic(charRef.characteristicId);
      if (!char) continue;

      for (const action of char.actions) {
        if (action.type === ActionType.SPEND_MANA_SELF) {
          requiredMana += action.value * charRef.value;
        }
        if (action.type === ActionType.SPEND_STAMINA_SELF) {
          requiredStamina += action.value * charRef.value;
        }
      }
    }

    return hero.currentMana >= requiredMana && hero.currentStamina >= requiredStamina;
  }

  private playBestAvailableCard(heroNum: 1 | 2): boolean {
    const deck = heroNum === 1 ? this.state.hero1Deck : this.state.hero2Deck;
    const attacker = heroNum === 1 ? this.state.hero1 : this.state.hero2;
    const cooldowns = heroNum === 1 ? this.state.cooldowns1 : this.state.cooldowns2;

    // Try to find a playable card
    for (let cardIndex = 0; cardIndex < deck.length; cardIndex++) {
      const cardId = deck[cardIndex];
      const card = this.getCard(cardId);
      if (!card) continue;

      // Check cooldown
      if (cooldowns.has(cardId) && cooldowns.get(cardId)! > 0) {
        continue; // Card is on cooldown, try next card
      }

      // Check if hero can afford to play this card
      if (!this.canPlayCard(card, attacker)) {
        continue; // Cannot afford, try next card
      }

      // Found a playable card, play it
      this.playCardByIndex(heroNum, cardIndex);
      return true; // Card was played
    }

    // No playable cards found
    this.log(`Hero ${heroNum}: No playable cards this turn`);
    return false; // No card was played
  }


  private processTurn() {
    this.state.turn++;
    this.log(`\n=== Turn ${this.state.turn} ===`);

    // Process active effects for both heroes at the start of the turn
    this.processActiveEffects(1);
    this.processActiveEffects(2);

    // Decay cooldowns
    this.state.cooldowns1.forEach((value, key) => {
      if (value > 0) this.state.cooldowns1.set(key, value - 1);
    });
    this.state.cooldowns2.forEach((value, key) => {
      if (value > 0) this.state.cooldowns2.set(key, value - 1);
    });

    // Determine who goes first this turn (alternates each turn)
    const firstPlayer = this.state.turn % 2 === 1 ? 1 : 2;
    const secondPlayer = firstPlayer === 1 ? 2 : 1;

    this.log(`Hero ${firstPlayer} goes first this turn`);

    // Each hero tries to play one available card per turn
    // They cycle through their deck trying to find a playable card
    const hero1Played = this.playBestAvailableCard(firstPlayer as 1 | 2);
    
    // Check if battle ended after first player's action
    if (this.checkBattleEnd()) return;
    
    const hero2Played = this.playBestAvailableCard(secondPlayer as 1 | 2);
    
    // Check if battle ended after second player's action
    if (this.checkBattleEnd()) return;

    // Track consecutive turns without any cards played (to prevent infinite loops)
    if (!hero1Played && !hero2Played) {
      this.consecutiveTurnsWithoutCards++;
      if (this.consecutiveTurnsWithoutCards >= 5) {
        this.log('Battle ended: No playable cards for 5 consecutive turns');
        // Determine winner based on current health
        if (this.state.hero1.currentHealth > this.state.hero2.currentHealth) {
          this.state.winner = 1;
        } else if (this.state.hero2.currentHealth > this.state.hero1.currentHealth) {
          this.state.winner = 2;
        } else {
          this.state.winner = null;
        }
        return;
      }
    } else {
      this.consecutiveTurnsWithoutCards = 0;
    }

    this.log(`Hero 1: HP ${this.state.hero1.currentHealth}/${this.state.hero1.health}, Mana ${this.state.hero1.currentMana}/${this.state.hero1.mana}, Stamina ${this.state.hero1.currentStamina}/${this.state.hero1.stamina}, Shield ${this.state.hero1.shield}`);
    this.log(`Hero 2: HP ${this.state.hero2.currentHealth}/${this.state.hero2.health}, Mana ${this.state.hero2.currentMana}/${this.state.hero2.mana}, Stamina ${this.state.hero2.currentStamina}/${this.state.hero2.stamina}, Shield ${this.state.hero2.shield}`);
  }

  private checkBattleEnd(): boolean {
    // Check for winner
    if (this.state.hero1.currentHealth <= 0 && this.state.hero2.currentHealth <= 0) {
      this.state.winner = null;
      this.log('Battle ended in a draw!');
      return true;
    } else if (this.state.hero1.currentHealth <= 0) {
      this.state.winner = 2;
      this.log('Hero 2 wins!');
      return true;
    } else if (this.state.hero2.currentHealth <= 0) {
      this.state.winner = 1;
      this.log('Hero 1 wins!');
      return true;
    }
    return false;
  }

  private playCardByIndex(heroNum: 1 | 2, cardIndex: number) {
    const deck = heroNum === 1 ? this.state.hero1Deck : this.state.hero2Deck;
    if (cardIndex >= deck.length) return;

    const cardId = deck[cardIndex];
    const card = this.getCard(cardId);
    if (!card) return;

    const attacker = heroNum === 1 ? this.state.hero1 : this.state.hero2;
    const defender = heroNum === 1 ? this.state.hero2 : this.state.hero1;
    const cooldowns = heroNum === 1 ? this.state.cooldowns1 : this.state.cooldowns2;

    // Check cooldown
    if (cooldowns.has(cardId) && cooldowns.get(cardId)! > 0) {
      this.log(`Hero ${heroNum}: ${card.name} is on cooldown (${cooldowns.get(cardId)} turns remaining)`);
      return; // Card is on cooldown
    }

    if (!this.canPlayCard(card, attacker)) {
      this.log(`Hero ${heroNum}: Cannot play ${card.name} (not enough resources)`);
      return; // Cannot afford to play card, skip it
    }

    this.log(`Hero ${heroNum} plays: ${card.name}`);

    let cardCooldown = 0;
    let effectDuration = 0;
    const effectActions: ActionBlock[] = [];
    const immediateActions: ActionBlock[] = [];
    const resourceCosts: ActionBlock[] = [];

    // Process all characteristics of the card
    for (const charRef of card.characteristics) {
      const char = this.getCharacteristic(charRef.characteristicId);
      if (!char) continue;

      // First pass: check for cooldown and effect duration
      for (const action of char.actions) {
        if (action.type === ActionType.COOLDOWN) {
          cardCooldown = Math.max(cardCooldown, action.value);
        } else if (action.type === ActionType.EFFECT_DURATION) {
          effectDuration = action.value;
        }
      }

      // Second pass: categorize actions
      for (const action of char.actions) {
        if (action.type === ActionType.COOLDOWN || action.type === ActionType.EFFECT_DURATION) {
          continue; // Already processed
        }

        const scaledAction = { ...action, value: action.value * charRef.value };
        
        // Resource costs are always immediate and never repeated
        if (action.type === ActionType.SPEND_MANA_SELF || 
            action.type === ActionType.SPEND_STAMINA_SELF ||
            action.type === ActionType.SPEND_MANA_ENEMY ||
            action.type === ActionType.SPEND_STAMINA_ENEMY) {
          resourceCosts.push(scaledAction);
        } else if (effectDuration > 0) {
          // This action will be part of a lasting effect (applied each turn)
          effectActions.push(scaledAction);
        } else {
          // Apply immediately (one-time effect)
          immediateActions.push(scaledAction);
        }
      }
    }

    // Apply resource costs first (only once, at card play)
    for (const action of resourceCosts) {
      this.applyAction(action, attacker, defender, card.name);
    }

    // Apply immediate actions (one-time effects)
    for (const action of immediateActions) {
      this.applyAction(action, attacker, defender, card.name);
    }

    // Set cooldown
    if (cardCooldown > 0) {
      cooldowns.set(cardId, cardCooldown);
      this.log(`${card.name}: Cooldown set to ${cardCooldown} turns`);
    }

    // Add lasting effect (will be applied each turn)
    if (effectDuration > 0 && effectActions.length > 0) {
      attacker.activeEffects.push({
        cardId: card.id,
        cardName: card.name,
        remainingDuration: effectDuration,
        actions: effectActions,
      });
      this.log(`${card.name}: Effect applied for ${effectDuration} turns`);
    }
  }

  private processActiveEffects(heroNum: 1 | 2) {
    const attacker = heroNum === 1 ? this.state.hero1 : this.state.hero2;
    const defender = heroNum === 1 ? this.state.hero2 : this.state.hero1;

    const remainingEffects: ActiveEffect[] = [];

    for (const effect of attacker.activeEffects) {
      if (effect.remainingDuration > 0) {
        this.log(`Hero ${heroNum}: ${effect.cardName} effect active (${effect.remainingDuration} turn(s) remaining)`);
        
        // Apply the effect actions each turn
        for (const action of effect.actions) {
          this.applyAction(action, attacker, defender, effect.cardName);
        }

        // Decrease duration after applying
        effect.remainingDuration--;
        
        // Keep effect if still has duration
        if (effect.remainingDuration > 0) {
          remainingEffects.push(effect);
        } else {
          this.log(`Hero ${heroNum}: ${effect.cardName} effect ended`);
        }
      }
    }

    attacker.activeEffects = remainingEffects;
  }


  public nextTurn() {
    if (this.state.winner !== undefined) return;
    this.processTurn();
  }

  public getState(): BattleState {
    return JSON.parse(JSON.stringify(this.state)); // Deep clone
  }

  public isFinished(): boolean {
    return this.state.winner !== undefined;
  }

  public runFullSimulation(maxTurns: number = 100): BattleState {
    while (!this.isFinished() && this.state.turn < maxTurns) {
      this.nextTurn();
    }

    if (!this.isFinished()) {
      this.log('Battle ended due to turn limit');
      // Winner is who has more health
      if (this.state.hero1.currentHealth > this.state.hero2.currentHealth) {
        this.state.winner = 1;
      } else if (this.state.hero2.currentHealth > this.state.hero1.currentHealth) {
        this.state.winner = 2;
      } else {
        this.state.winner = null;
      }
    }

    return this.getState();
  }
}
