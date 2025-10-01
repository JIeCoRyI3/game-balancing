import {
  SimulationResult,
  CardAnalytics,
  SimulationAnalytics,
  BalanceRecommendation,
  Card,
} from '../types';

export function analyzeSimulations(
  results: SimulationResult[],
  allCards: Card[]
): SimulationAnalytics {
  // Build card statistics
  const cardStats = new Map<string, {
    cardId: string;
    cardName: string;
    appearances: number;
    wins: number;
    losses: number;
    draws: number;
    healthWhenWin: number[];
    manaWhenWin: number[];
    staminaWhenWin: number[];
    healthWhenLose: number[];
    manaWhenLose: number[];
    staminaWhenLose: number[];
  }>();

  // Initialize card stats for all cards
  allCards.forEach(card => {
    cardStats.set(card.id, {
      cardId: card.id,
      cardName: card.name,
      appearances: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      healthWhenWin: [],
      manaWhenWin: [],
      staminaWhenWin: [],
      healthWhenLose: [],
      manaWhenLose: [],
      staminaWhenLose: [],
    });
  });

  // Process each simulation result
  results.forEach(result => {
    // Track cards for hero 1
    result.hero1Cards.forEach(cardId => {
      const stats = cardStats.get(cardId);
      if (!stats) return;

      stats.appearances++;

      if (result.winner === 1) {
        stats.wins++;
        stats.healthWhenWin.push(result.hero1InitialSettings.health);
        stats.manaWhenWin.push(result.hero1InitialSettings.mana);
        stats.staminaWhenWin.push(result.hero1InitialSettings.stamina);
      } else if (result.winner === 2) {
        stats.losses++;
        stats.healthWhenLose.push(result.hero1InitialSettings.health);
        stats.manaWhenLose.push(result.hero1InitialSettings.mana);
        stats.staminaWhenLose.push(result.hero1InitialSettings.stamina);
      } else {
        stats.draws++;
      }
    });

    // Track cards for hero 2
    result.hero2Cards.forEach(cardId => {
      const stats = cardStats.get(cardId);
      if (!stats) return;

      stats.appearances++;

      if (result.winner === 2) {
        stats.wins++;
        stats.healthWhenWin.push(result.hero2InitialSettings.health);
        stats.manaWhenWin.push(result.hero2InitialSettings.mana);
        stats.staminaWhenWin.push(result.hero2InitialSettings.stamina);
      } else if (result.winner === 1) {
        stats.losses++;
        stats.healthWhenLose.push(result.hero2InitialSettings.health);
        stats.manaWhenLose.push(result.hero2InitialSettings.mana);
        stats.staminaWhenLose.push(result.hero2InitialSettings.stamina);
      } else {
        stats.draws++;
      }
    });
  });

  // Calculate analytics for each card
  const cardAnalytics: CardAnalytics[] = [];

  cardStats.forEach(stats => {
    if (stats.appearances === 0) return; // Skip cards that never appeared

    const totalDecisive = stats.wins + stats.losses;
    const winRate = totalDecisive > 0 ? (stats.wins / totalDecisive) * 100 : 0;

    const avgHealthWhenWin = stats.healthWhenWin.length > 0
      ? stats.healthWhenWin.reduce((a, b) => a + b, 0) / stats.healthWhenWin.length
      : 0;
    
    const avgManaWhenWin = stats.manaWhenWin.length > 0
      ? stats.manaWhenWin.reduce((a, b) => a + b, 0) / stats.manaWhenWin.length
      : 0;
    
    const avgStaminaWhenWin = stats.staminaWhenWin.length > 0
      ? stats.staminaWhenWin.reduce((a, b) => a + b, 0) / stats.staminaWhenWin.length
      : 0;

    const avgHealthWhenLose = stats.healthWhenLose.length > 0
      ? stats.healthWhenLose.reduce((a, b) => a + b, 0) / stats.healthWhenLose.length
      : 0;
    
    const avgManaWhenLose = stats.manaWhenLose.length > 0
      ? stats.manaWhenLose.reduce((a, b) => a + b, 0) / stats.manaWhenLose.length
      : 0;
    
    const avgStaminaWhenLose = stats.staminaWhenLose.length > 0
      ? stats.staminaWhenLose.reduce((a, b) => a + b, 0) / stats.staminaWhenLose.length
      : 0;

    // Impact score: how much this card affects outcomes
    // Higher win rate deviation from 50% = more impact
    // More appearances = more reliable data
    const winRateDeviation = Math.abs(winRate - 50);
    const appearanceWeight = Math.min(stats.appearances / 10, 1); // Cap at 10 appearances for full weight
    const impactScore = winRateDeviation * appearanceWeight;

    cardAnalytics.push({
      cardId: stats.cardId,
      cardName: stats.cardName,
      totalAppearances: stats.appearances,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate,
      avgHealthWhenWin,
      avgManaWhenWin,
      avgStaminaWhenWin,
      avgHealthWhenLose,
      avgManaWhenLose,
      avgStaminaWhenLose,
      impactScore,
    });
  });

  // Sort by impact score (most impactful first)
  cardAnalytics.sort((a, b) => b.impactScore - a.impactScore);

  // Generate recommendations
  const recommendations = generateRecommendations(cardAnalytics);

  return {
    totalSimulations: results.length,
    results,
    cardAnalytics,
    recommendations,
  };
}

function generateRecommendations(cardAnalytics: CardAnalytics[]): BalanceRecommendation[] {
  const recommendations: BalanceRecommendation[] = [];

  cardAnalytics.forEach(analytics => {
    // Skip cards with insufficient data
    if (analytics.totalAppearances < 5) return;

    const { cardId, cardName, winRate, impactScore } = analytics;

    // Overpowered cards: high win rate and high impact
    if (winRate > 70 && impactScore > 15) {
      recommendations.push({
        cardId,
        cardName,
        issue: 'overpowered',
        severity: 'high',
        description: `${cardName} имеет очень высокий винрейт ${winRate.toFixed(1)}% и сильно влияет на исход боя (импакт: ${impactScore.toFixed(1)}). Рекомендуется уменьшить силу карты.`,
        winRate,
        impactScore,
      });
    } else if (winRate > 65 && impactScore > 10) {
      recommendations.push({
        cardId,
        cardName,
        issue: 'overpowered',
        severity: 'medium',
        description: `${cardName} показывает повышенный винрейт ${winRate.toFixed(1)}% и заметно влияет на баланс (импакт: ${impactScore.toFixed(1)}). Возможно, требуется небольшой нерф.`,
        winRate,
        impactScore,
      });
    }
    // Underpowered cards: low win rate and high impact
    else if (winRate < 30 && impactScore > 15) {
      recommendations.push({
        cardId,
        cardName,
        issue: 'underpowered',
        severity: 'high',
        description: `${cardName} имеет очень низкий винрейт ${winRate.toFixed(1)}% и сильно влияет на исход боя (импакт: ${impactScore.toFixed(1)}). Рекомендуется усилить карту.`,
        winRate,
        impactScore,
      });
    } else if (winRate < 35 && impactScore > 10) {
      recommendations.push({
        cardId,
        cardName,
        issue: 'underpowered',
        severity: 'medium',
        description: `${cardName} показывает пониженный винрейт ${winRate.toFixed(1)}% и заметно влияет на баланс (импакт: ${impactScore.toFixed(1)}). Возможно, требуется небольшой бафф.`,
        winRate,
        impactScore,
      });
    }
    // Balanced but high impact
    else if (winRate >= 45 && winRate <= 55 && impactScore > 20) {
      recommendations.push({
        cardId,
        cardName,
        issue: 'balanced',
        severity: 'low',
        description: `${cardName} имеет сбалансированный винрейт ${winRate.toFixed(1)}%, но очень сильно влияет на исход боя (импакт: ${impactScore.toFixed(1)}). Карта может быть слишком важной для метагейма.`,
        winRate,
        impactScore,
      });
    }
  });

  // Sort by severity and impact
  const severityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.impactScore - a.impactScore;
  });

  return recommendations;
}

export function getCardWinRateByStats(
  cardId: string,
  analytics: SimulationAnalytics,
  healthRange: [number, number],
  manaStaminaRange: [number, number]
): { wins: number; total: number; winRate: number } {
  const relevantResults = analytics.results.filter(result => {
    // Check if this card was in hero 1's deck
    const inHero1 = result.hero1Cards.includes(cardId);
    const inHero2 = result.hero2Cards.includes(cardId);

    if (inHero1) {
      const healthInRange = result.hero1InitialSettings.health >= healthRange[0] && 
                           result.hero1InitialSettings.health <= healthRange[1];
      const manaInRange = result.hero1InitialSettings.mana >= manaStaminaRange[0] && 
                         result.hero1InitialSettings.mana <= manaStaminaRange[1];
      const staminaInRange = result.hero1InitialSettings.stamina >= manaStaminaRange[0] && 
                            result.hero1InitialSettings.stamina <= manaStaminaRange[1];
      
      return healthInRange && (manaInRange || staminaInRange);
    } else if (inHero2) {
      const healthInRange = result.hero2InitialSettings.health >= healthRange[0] && 
                           result.hero2InitialSettings.health <= healthRange[1];
      const manaInRange = result.hero2InitialSettings.mana >= manaStaminaRange[0] && 
                         result.hero2InitialSettings.mana <= manaStaminaRange[1];
      const staminaInRange = result.hero2InitialSettings.stamina >= manaStaminaRange[0] && 
                            result.hero2InitialSettings.stamina <= manaStaminaRange[1];
      
      return healthInRange && (manaInRange || staminaInRange);
    }

    return false;
  });

  let wins = 0;
  relevantResults.forEach(result => {
    const inHero1 = result.hero1Cards.includes(cardId);
    if ((inHero1 && result.winner === 1) || (!inHero1 && result.winner === 2)) {
      wins++;
    }
  });

  return {
    wins,
    total: relevantResults.length,
    winRate: relevantResults.length > 0 ? (wins / relevantResults.length) * 100 : 0,
  };
}

export interface StatRangeBalance {
  healthRange: [number, number];
  resourceRange: [number, number];
  avgWinRateDeviation: number;
  totalBattles: number;
  cardStats: Array<{
    cardId: string;
    cardName: string;
    winRate: number;
    deviation: number;
  }>;
}

export function findBestBalancedRanges(
  analytics: SimulationAnalytics,
  allCards: Card[],
  healthBuckets: number = 5,
  resourceBuckets: number = 5,
  baseHealth: number,
  baseResource: number
): StatRangeBalance[] {
  const maxHealth = baseHealth * 10;
  const maxResource = baseResource * 10;
  const healthStep = maxHealth / healthBuckets;
  const resourceStep = maxResource / resourceBuckets;

  const rangeAnalyses: StatRangeBalance[] = [];

  for (let h = 0; h < healthBuckets; h++) {
    for (let r = 0; r < resourceBuckets; r++) {
      const healthMin = h * healthStep;
      const healthMax = (h + 1) * healthStep;
      const resourceMin = r * resourceStep;
      const resourceMax = (r + 1) * resourceStep;

      const cardStats: Array<{ cardId: string; cardName: string; winRate: number; deviation: number }> = [];
      let totalBattles = 0;

      // Analyze each card in this range
      allCards.forEach(card => {
        const stats = getCardWinRateByStats(
          card.id,
          analytics,
          [healthMin, healthMax],
          [resourceMin, resourceMax]
        );

        if (stats.total >= 3) { // Minimum sample size
          totalBattles = Math.max(totalBattles, stats.total);
          const deviation = Math.abs(stats.winRate - 50);
          cardStats.push({
            cardId: card.id,
            cardName: card.name,
            winRate: stats.winRate,
            deviation,
          });
        }
      });

      // Calculate average deviation for this range
      if (cardStats.length >= 2 && totalBattles >= 5) {
        const avgDeviation = cardStats.reduce((sum, stat) => sum + stat.deviation, 0) / cardStats.length;
        
        rangeAnalyses.push({
          healthRange: [healthMin, healthMax],
          resourceRange: [resourceMin, resourceMax],
          avgWinRateDeviation: avgDeviation,
          totalBattles,
          cardStats: cardStats.sort((a, b) => a.deviation - b.deviation),
        });
      }
    }
  }

  // Sort by best balance (lowest average deviation)
  return rangeAnalyses.sort((a, b) => a.avgWinRateDeviation - b.avgWinRateDeviation);
}

export interface CardWinRateAtStats {
  cardId: string;
  cardName: string;
  winRate: number;
  wins: number;
  total: number;
  deviation: number;
}

export function getCardsWinRateAtSpecificStats(
  analytics: SimulationAnalytics,
  allCards: Card[],
  health: number,
  manaStamina: number,
  tolerance: number = 50 // tolerance range for matching
): CardWinRateAtStats[] {
  const results: CardWinRateAtStats[] = [];

  allCards.forEach(card => {
    const stats = getCardWinRateByStats(
      card.id,
      analytics,
      [health - tolerance, health + tolerance],
      [manaStamina - tolerance, manaStamina + tolerance]
    );

    if (stats.total > 0) {
      results.push({
        cardId: card.id,
        cardName: card.name,
        winRate: stats.winRate,
        wins: stats.wins,
        total: stats.total,
        deviation: Math.abs(stats.winRate - 50),
      });
    }
  });

  return results.sort((a, b) => b.winRate - a.winRate);
}

export interface CharacteristicPowerPointSuggestion {
  characteristicId: string;
  characteristicName: string;
  currentPowerPoints: number;
  suggestedPowerPoints: number;
  multiplier: number; // How much to multiply/divide values by
  adjustment: number;
  avgWinRateWhenUsed: number;
  totalUsages: number;
  reason: string;
}

export interface PowerPointSuggestion {
  cardId: string;
  cardName: string;
  currentPowerPoints: number;
  suggestedPowerPoints: number;
  adjustment: number;
  winRate: number;
  reason: string;
}

export function calculateCharacteristicPowerPointSuggestions(
  analytics: SimulationAnalytics,
  allCards: Card[],
  characteristics: any[]
): CharacteristicPowerPointSuggestion[] {
  // Build statistics for each characteristic
  const charStats = new Map<string, {
    characteristicId: string;
    totalUsages: number;
    totalWins: number;
    totalLosses: number;
    weightedPowerPoints: number; // Sum of (usage_in_card * card_power_points)
    totalWeight: number; // Sum of usage values
  }>();

  // Initialize stats for all characteristics
  characteristics.forEach(char => {
    charStats.set(char.id, {
      characteristicId: char.id,
      totalUsages: 0,
      totalWins: 0,
      totalLosses: 0,
      weightedPowerPoints: 0,
      totalWeight: 0,
    });
  });

  // Analyze each card
  analytics.cardAnalytics.forEach(cardAnalytics => {
    const card = allCards.find(c => c.id === cardAnalytics.cardId);
    if (!card || cardAnalytics.totalAppearances < 5) return;

    const totalDecisive = cardAnalytics.wins + cardAnalytics.losses;
    if (totalDecisive === 0) return;

    // For each characteristic in this card
    card.characteristics.forEach(charRef => {
      const stats = charStats.get(charRef.characteristicId);
      if (!stats) return;

      stats.totalUsages += cardAnalytics.totalAppearances;
      stats.totalWins += cardAnalytics.wins;
      stats.totalLosses += cardAnalytics.losses;
      stats.weightedPowerPoints += charRef.value * cardAnalytics.totalAppearances;
      stats.totalWeight += charRef.value * cardAnalytics.totalAppearances;
    });
  });

  const suggestions: CharacteristicPowerPointSuggestion[] = [];

  // Calculate suggestions for each characteristic
  characteristics.forEach(char => {
    const stats = charStats.get(char.id);
    if (!stats || stats.totalUsages < 10) return; // Need sufficient data

    const totalDecisive = stats.totalWins + stats.totalLosses;
    if (totalDecisive === 0) return;

    const winRate = (stats.totalWins / totalDecisive) * 100;
    const currentPP = char.powerPoints;

    // Calculate suggested power points based on win rate
    // Higher win rate = characteristic is stronger = should cost more power points
    const winRateDeviation = winRate - 50;
    const baseAdjustment = winRateDeviation * 0.02; // More conservative than card-level
    
    // Weight by usage frequency
    const usageWeight = Math.min(stats.totalUsages / 50, 1.5); // Cap at 1.5x
    const weightedAdjustment = baseAdjustment * usageWeight;
    
    const suggestedPP = currentPP + weightedAdjustment;
    
    // Calculate multiplier for rebalancing values
    // If PP increases, values should decrease proportionally
    const multiplier = currentPP !== 0 ? currentPP / suggestedPP : 1;

    if (Math.abs(weightedAdjustment) >= 0.1) {
      let reason = '';
      if (winRate > 55) {
        reason = `Характеристика с винрейтом ${winRate.toFixed(1)}% переоценена. Нужно увеличить поинты силы с ${currentPP.toFixed(2)} до ${suggestedPP.toFixed(2)}. Значения характеристики в картах нужно умножить на ${multiplier.toFixed(3)}.`;
      } else if (winRate < 45) {
        reason = `Характеристика с винрейтом ${winRate.toFixed(1)}% недооценена. Нужно уменьшить поинты силы с ${currentPP.toFixed(2)} до ${suggestedPP.toFixed(2)}. Значения характеристики в картах нужно умножить на ${multiplier.toFixed(3)}.`;
      } else {
        reason = `Винрейт ${winRate.toFixed(1)}% показывает небольшой дисбаланс. Корректировка улучшит баланс.`;
      }

      suggestions.push({
        characteristicId: char.id,
        characteristicName: char.name,
        currentPowerPoints: currentPP,
        suggestedPowerPoints: suggestedPP,
        multiplier,
        adjustment: weightedAdjustment,
        avgWinRateWhenUsed: winRate,
        totalUsages: stats.totalUsages,
        reason,
      });
    }
  });

  return suggestions.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));
}

export function calculatePowerPointSuggestions(
  analytics: SimulationAnalytics,
  allCards: Card[]
): PowerPointSuggestion[] {
  const suggestions: PowerPointSuggestion[] = [];

  analytics.cardAnalytics.forEach(cardAnalytics => {
    const card = allCards.find(c => c.id === cardAnalytics.cardId);
    if (!card || cardAnalytics.totalAppearances < 5) return;

    const { winRate, impactScore } = cardAnalytics;
    const currentPP = card.totalPowerPoints;

    // Calculate suggested adjustment based on win rate deviation
    // Formula: cards with higher win rates should have higher (more costly) power points
    // Target: 50% win rate = 0 power points
    // Each 1% deviation from 50% suggests ~0.5 power point adjustment
    const winRateDeviation = winRate - 50;
    const baseAdjustment = winRateDeviation * 0.5;
    
    // Weight adjustment by impact score (more impactful = more confident in adjustment)
    const impactWeight = Math.min(impactScore / 20, 1.5); // Cap at 1.5x
    const weightedAdjustment = baseAdjustment * impactWeight;
    
    // Round to nearest 0.5
    const adjustment = Math.round(weightedAdjustment * 2) / 2;
    const suggestedPP = Math.round((currentPP + adjustment) * 2) / 2;

    if (Math.abs(adjustment) >= 0.5) {
      let reason = '';
      if (winRate > 60) {
        reason = `Высокий винрейт (${winRate.toFixed(1)}%) указывает на то, что карта слишком сильная. Увеличение поинтов силы сделает её более дорогой.`;
      } else if (winRate < 40) {
        reason = `Низкий винрейт (${winRate.toFixed(1)}%) указывает на то, что карта слишком слабая. Уменьшение поинтов силы сделает её более доступной.`;
      } else {
        reason = `Винрейт ${winRate.toFixed(1)}% показывает небольшой дисбаланс. Корректировка поинтов силы улучшит баланс.`;
      }

      suggestions.push({
        cardId: card.id,
        cardName: card.name,
        currentPowerPoints: currentPP,
        suggestedPowerPoints: suggestedPP,
        adjustment,
        winRate,
        reason,
      });
    }
  });

  return suggestions.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));
}

export interface BalancedSystemSuggestion {
  targetHealth: number;
  targetMana: number;
  targetStamina: number;
  scalingMultiplier: number; // Common multiplier to make all values integers
  description: string;
  characteristicAdjustments: Array<{
    characteristicId: string;
    characteristicName: string;
    currentPowerPoints: number;
    newPowerPoints: number;
    multiplier: number;
  }>;
  cardExamples: Array<{
    cardId: string;
    cardName: string;
    currentTotalPP: number;
    newTotalPP: number;
    characteristics: Array<{
      characteristicId: string;
      name: string;
      currentValue: number;
      newValue: number;
      currentPP: number;
      newPP: number;
    }>;
  }>;
}

// Find GCD of multiple numbers
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function findGCD(numbers: number[]): number {
  return numbers.reduce((acc, num) => gcd(acc, num), numbers[0]);
}

// Find LCM of multiple numbers
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function findLCM(numbers: number[]): number {
  return numbers.reduce((acc, num) => lcm(acc, num), numbers[0]);
}

export function calculateBalancedSystem(
  analytics: SimulationAnalytics,
  allCards: Card[],
  characteristics: any[],
  baseHealth: number,
  baseMana: number,
  baseStamina: number
): BalancedSystemSuggestion | null {
  // Step 1: Calculate characteristic power point adjustments
  const charSuggestions = calculateCharacteristicPowerPointSuggestions(
    analytics,
    allCards,
    characteristics
  );

  if (charSuggestions.length === 0) {
    return null;
  }

  // Step 2: Build a map of characteristic adjustments
  const charAdjustments = new Map<string, {
    newPP: number;
    multiplier: number;
  }>();

  characteristics.forEach(char => {
    const suggestion = charSuggestions.find(s => s.characteristicId === char.id);
    if (suggestion) {
      charAdjustments.set(char.id, {
        newPP: suggestion.suggestedPowerPoints,
        multiplier: suggestion.multiplier,
      });
    } else {
      charAdjustments.set(char.id, {
        newPP: char.powerPoints,
        multiplier: 1,
      });
    }
  });

  // Step 3: Calculate new card values with adjusted characteristics
  const cardExamples: Array<{
    cardId: string;
    cardName: string;
    currentTotalPP: number;
    newTotalPP: number;
    characteristics: Array<{
      characteristicId: string;
      name: string;
      currentValue: number;
      newValue: number;
      currentPP: number;
      newPP: number;
    }>;
  }> = [];

  allCards.forEach(card => {
    const charDetails = card.characteristics.map(charRef => {
      const char = characteristics.find(c => c.id === charRef.characteristicId);
      const adjustment = charAdjustments.get(charRef.characteristicId);
      
      const currentValue = charRef.value;
      const newValue = adjustment ? currentValue * adjustment.multiplier : currentValue;
      const currentPP = char ? char.powerPoints * currentValue : 0;
      const newPP = adjustment ? adjustment.newPP * newValue : currentPP;

      return {
        characteristicId: charRef.characteristicId,
        name: char?.name || 'Unknown',
        currentValue,
        newValue,
        currentPP,
        newPP,
      };
    });

    const currentTotalPP = charDetails.reduce((sum, c) => sum + c.currentPP, 0);
    const newTotalPP = charDetails.reduce((sum, c) => sum + c.newPP, 0);

    cardExamples.push({
      cardId: card.id,
      cardName: card.name,
      currentTotalPP,
      newTotalPP,
      characteristics: charDetails,
    });
  });

  // Step 4: Find scaling multiplier to make all values integers
  // Collect all fractional parts that need to be made whole
  const allNewValues: number[] = [];
  
  cardExamples.forEach(card => {
    card.characteristics.forEach(char => {
      if (char.newValue !== Math.floor(char.newValue)) {
        allNewValues.push(char.newValue);
      }
    });
  });

  // Calculate a common multiplier to make all values integers
  let scalingMultiplier = 1;
  
  if (allNewValues.length > 0) {
    // Find the maximum number of decimal places
    let maxDecimals = 0;
    allNewValues.forEach(val => {
      const decimals = (val.toString().split('.')[1] || '').length;
      maxDecimals = Math.max(maxDecimals, decimals);
    });
    
    // Start with 10^maxDecimals as base multiplier
    scalingMultiplier = Math.pow(10, Math.min(maxDecimals, 3));
    
    // Verify and adjust if needed
    let allInteger = false;
    let attempts = 0;
    while (!allInteger && attempts < 100) {
      allInteger = true;
      for (const val of allNewValues) {
        const scaled = val * scalingMultiplier;
        if (Math.abs(scaled - Math.round(scaled)) > 0.001) {
          allInteger = false;
          break;
        }
      }
      if (!allInteger) {
        scalingMultiplier += 1;
      }
      attempts++;
    }
  }

  // Step 5: Apply scaling multiplier to all values and calculate final stats
  const finalCardExamples = cardExamples.map(card => ({
    ...card,
    characteristics: card.characteristics.map(char => ({
      ...char,
      newValue: Math.round(char.newValue * scalingMultiplier),
    })),
  }));

  const characteristicAdjustments = charSuggestions.map(sugg => ({
    characteristicId: sugg.characteristicId,
    characteristicName: sugg.characteristicName,
    currentPowerPoints: sugg.currentPowerPoints,
    newPowerPoints: sugg.suggestedPowerPoints,
    multiplier: sugg.multiplier * scalingMultiplier,
  }));

  // Step 6: Calculate target health/mana/stamina
  const targetHealth = Math.round(baseHealth * scalingMultiplier / 10) * 10;
  const targetMana = Math.round(baseMana * scalingMultiplier / 10) * 10;
  const targetStamina = Math.round(baseStamina * scalingMultiplier / 10) * 10;

  const description = `Предложена сбалансированная система, где характеристики перераспределены по силе, а все значения приведены к целым числам. ` +
    `Масштабирующий множитель: ${scalingMultiplier.toFixed(2)}. ` +
    `Это гарантирует, что сила всех карт стремится к 0 поинтов при правильном балансе характеристик.`;

  return {
    targetHealth,
    targetMana,
    targetStamina,
    scalingMultiplier,
    description,
    characteristicAdjustments,
    cardExamples: finalCardExamples,
  };
}

export interface ScalingSuggestion {
  targetHealth: number;
  targetMana: number;
  targetStamina: number;
  healthScale: number;
  resourceScale: number;
  description: string;
  cardAdjustments: Array<{
    cardId: string;
    cardName: string;
    currentPowerPoints: number;
    scaledPowerPoints: number;
    characteristics: Array<{
      name: string;
      currentValue: number;
      scaledValue: number;
    }>;
  }>;
}

export function calculateScalingSuggestions(
  analytics: SimulationAnalytics,
  allCards: Card[],
  bestBalanceRange: StatRangeBalance | null,
  characteristics: any[]
): ScalingSuggestion[] {
  const suggestions: ScalingSuggestion[] = [];

  if (!bestBalanceRange) return suggestions;

  // Get the center of the best balanced range
  const targetHealth = Math.round((bestBalanceRange.healthRange[0] + bestBalanceRange.healthRange[1]) / 2);
  const targetResource = Math.round((bestBalanceRange.resourceRange[0] + bestBalanceRange.resourceRange[1]) / 2);

  // Find nice round numbers close to these targets
  const roundedHealth = Math.round(targetHealth / 10) * 10;
  const roundedResource = Math.round(targetResource / 10) * 10;

  // Calculate scale factors
  const avgHealth = (bestBalanceRange.healthRange[0] + bestBalanceRange.healthRange[1]) / 2;
  const avgResource = (bestBalanceRange.resourceRange[0] + bestBalanceRange.resourceRange[1]) / 2;
  
  const healthScale = roundedHealth / avgHealth;
  const resourceScale = roundedResource / avgResource;

  // Calculate card adjustments based on power point suggestions
  const powerPointSuggestions = calculatePowerPointSuggestions(analytics, allCards);
  
  const cardAdjustments = allCards.map(card => {
    const suggestion = powerPointSuggestions.find(s => s.cardId === card.id);
    const scaledPP = suggestion ? suggestion.suggestedPowerPoints : card.totalPowerPoints;

    const charDetails = card.characteristics.map(charRef => {
      const char = characteristics.find(c => c.id === charRef.characteristicId);
      return {
        name: char?.name || 'Unknown',
        currentValue: charRef.value,
        scaledValue: charRef.value, // Keep values the same, only PP changes
      };
    });

    return {
      cardId: card.id,
      cardName: card.name,
      currentPowerPoints: card.totalPowerPoints,
      scaledPowerPoints: scaledPP,
      characteristics: charDetails,
    };
  });

  suggestions.push({
    targetHealth: roundedHealth,
    targetMana: roundedResource,
    targetStamina: roundedResource,
    healthScale,
    resourceScale,
    description: `Рекомендуется использовать здоровье ${roundedHealth} и ману/выносливость ${roundedResource} для наилучшего баланса. Это округленные значения на основе диапазона с лучшим балансом карт.`,
    cardAdjustments: cardAdjustments.filter(adj => adj.currentPowerPoints !== adj.scaledPowerPoints),
  });

  return suggestions;
}
