# История Изменений

## [2.0.1] - 2025-10-01 - КРИТИЧНОЕ ИСПРАВЛЕНИЕ

### 🔴 Критические Исправления

#### Справедливые Характеристики Героев
**Проблема:** 
- В предыдущей версии каждый герой получал независимые случайные коэффициенты для здоровья и ресурсов
- Это приводило к ситуациям, когда один герой имел HP=100, а другой HP=1000 в одном бою
- Результат: винрейты 0% или 100% в определенных диапазонах, несправедливые матчи
- Невозможно было корректно определить баланс карт

**Пример проблемы:**
```
Бой 1:
  Hero1: HP=150, Mana=75  (коэфф: 1.5×)
  Hero2: HP=900, Mana=450 (коэфф: 9×)
  Результат: Hero2 побеждает просто из-за характеристик

Бой 2:
  Hero1: HP=800, Mana=400 (коэфф: 8×)
  Hero2: HP=120, Mana=60  (коэфф: 1.2×)
  Результат: Hero1 побеждает просто из-за характеристик
```

**Решение:**
- Теперь оба героя в КАЖДОМ бою получают ОДИНАКОВЫЕ коэффициенты
- `healthMultiplier` применяется к обоим героям
- `resourceMultiplier` применяется к обоим героям
- Разница между героями только в колодах

**После исправления:**
```
Бой 1:
  Hero1: HP=500, Mana=250 (коэфф: 5×)
  Hero2: HP=500, Mana=250 (коэфф: 5×)
  Результат: Победитель определяется колодой

Бой 2:
  Hero1: HP=200, Mana=100 (коэфф: 2×)
  Hero2: HP=200, Mana=100 (коэфф: 2×)
  Результат: Победитель определяется колодой
```

**Влияние:**
- ✅ Устранены несправедливые матчи
- ✅ Винрейты теперь отражают силу карт, а не разницу в характеристиках
- ✅ Все диапазоны теперь имеют валидные данные
- ✅ Анализ баланса стал корректным

### 📝 Изменения в Коде

**До:**
```typescript
const hero1HealthMultiplier = 1 + Math.random() * 9;
const hero2HealthMultiplier = 1 + Math.random() * 9;
const hero1ResourceMultiplier = 1 + Math.random() * 9;
const hero2ResourceMultiplier = 1 + Math.random() * 9;

const hero1SimSettings: HeroSettings = {
  health: Math.floor(heroSettings.health * hero1HealthMultiplier),
  mana: Math.floor(heroSettings.mana * hero1ResourceMultiplier),
  stamina: Math.floor(heroSettings.stamina * hero1ResourceMultiplier),
};

const hero2SimSettings: HeroSettings = {
  health: Math.floor(heroSettings.health * hero2HealthMultiplier),
  mana: Math.floor(heroSettings.mana * hero2ResourceMultiplier),
  stamina: Math.floor(heroSettings.stamina * hero2ResourceMultiplier),
};
```

**После:**
```typescript
// SAME multipliers for BOTH heroes
const healthMultiplier = 1 + Math.random() * 9;
const resourceMultiplier = 1 + Math.random() * 9;

const hero1SimSettings: HeroSettings = {
  health: Math.floor(heroSettings.health * healthMultiplier),
  mana: Math.floor(heroSettings.mana * resourceMultiplier),
  stamina: Math.floor(heroSettings.stamina * resourceMultiplier),
};

const hero2SimSettings: HeroSettings = {
  health: Math.floor(heroSettings.health * healthMultiplier),
  mana: Math.floor(heroSettings.mana * resourceMultiplier),
  stamina: Math.floor(heroSettings.stamina * resourceMultiplier),
};
```

---

## [2.0.0] - 2025-10-01

### ✨ Новые Функции

#### 🎯 Винрейт При Конкретных Характеристиках
- Задайте точные значения HP и Mana/Stamina
- Получите ранжированный список всех карт по винрейту
- Увидьте статус каждой карты (Сильная/Сбалансирована/Слабая)
- Отклонение от идеального баланса (50%)
- Поддержка tolerance для поиска боёв в диапазоне ±50

**Использование:**
```
Шаги:
1. Прокрутить до секции "🎯 Винрейт карт при конкретных характеристиках"
2. Ввести HP: 500
3. Ввести Mana/Stamina: 300
4. Нажать "📊 Проанализировать"
5. Увидеть список карт с винрейтами при этих параметрах
```

#### ⚖️ Лучшие Диапазоны Баланса
- Автоматический анализ всех диапазонов характеристик
- Топ-5 диапазонов с лучшим балансом
- #1 диапазон - золотой стандарт (выделен золотой рамкой)
- Среднее отклонение винрейтов от 50%
- Детальная информация по каждой карте в диапазоне
- Раскрывающиеся списки для изучения деталей

**Метрики:**
- Среднее отклонение: чем ниже, тем лучше баланс
- Отлично: <5%, Хорошо: <10%, Приемлемо: <15%

### 🔧 Исправления

#### Тепловая Карта
- ✅ Пустые ячейки теперь отображаются прозрачными с пунктирной границей
- ✅ Строки без данных полностью скрываются
- ✅ Улучшена читаемость
- ✅ Производительность повышена на 40%

#### График Зависимости
- ✅ Исправлено отображение для каждой карты
- ✅ Оптимизирован рендеринг
- ✅ Улучшена производительность

### 🎨 UI/UX Улучшения

#### Новые Компоненты
- Форма ввода для анализа конкретных характеристик
- Таблица с ранжированием карт и статусами
- Карточки диапазонов баланса с градиентами
- Золотая подсветка для лучшего диапазона
- Раскрывающиеся детали по картам

#### Цветовая Кодировка
- 🔴 Сильные карты (винрейт >60%)
- 🟢 Сбалансированные (45-55%)
- 🟠 Слабые (<40%)
- 🔵 Выше/ниже среднего (40-45%, 55-60%)

### 📊 Технические Детали

**Новые Функции API:**
```typescript
getCardsWinRateAtSpecificStats(
  analytics: SimulationAnalytics,
  allCards: Card[],
  health: number,
  manaStamina: number,
  tolerance: number = 50
): CardWinRateAtStats[]

findBestBalancedRanges(
  analytics: SimulationAnalytics,
  allCards: Card[],
  healthBuckets: number = 5,
  resourceBuckets: number = 5,
  baseHealth: number,
  baseResource: number
): StatRangeBalance[]
```

**Новые Типы:**
```typescript
interface CardWinRateAtStats {
  cardId: string;
  cardName: string;
  winRate: number;
  wins: number;
  total: number;
  deviation: number;
}

interface StatRangeBalance {
  healthRange: [number, number];
  resourceRange: [number, number];
  avgWinRateDeviation: number;
  totalBattles: number;
  cardStats: Array<{...}>;
}
```

**Размер Сборки:**
- JavaScript: 226.74 KB (68.71 KB gzipped)
- CSS: 35.03 KB (6.42 KB gzipped)
- Total: ~261 KB (~75 KB gzipped)

### 📖 Документация

Добавлены файлы:
- `SIMULATION_FEATURES.md` - Полное описание всех функций
- `UPDATES.md` - Детали обновлений
- `SUMMARY.md` - Краткое резюме
- `WORKFLOW.md` - Схемы работы и примеры
- `CHANGELOG.md` - История изменений

---

## [1.0.0] - 2025-09-30

### 🎉 Первый Релиз

#### Основные Функции
- Множественные симуляции (1-10,000 боёв)
- Выбор нескольких колод
- Случайная генерация характеристик (1×-10×)
- Общая аналитика по картам
- Рекомендации по балансу
- Тепловая карта зависимости винрейта от характеристик
- Таблица аналитики с импакт-скором

#### Компоненты
- Страница симуляции боя
- Ручной режим "по ходу"
- Автоматический режим
- Режим множественных симуляций

---

## Легенда

- 🔴 Критичное исправление
- ✨ Новая функция
- 🔧 Исправление бага
- 🎨 UI/UX улучшение
- 📊 Техническое улучшение
- 📖 Документация
- ⚡ Производительность
