export type FoodItemId =
  | 'water'
  | 'bubble-tea'
  | 'ice-cream'
  | 'burger'
  | 'popcorn';

export type FoodItemCategory = 'food' | 'drink';

export interface FoodCatalogItem {
  id: FoodItemId;
  name: string;
  category: FoodItemCategory;
  actionLabel: 'Eat' | 'Drink';
  gerundLabel: 'Eating' | 'Drinking';
  description: string;
  price: number;
  icon: string;
  durationMs: number;
  primaryColor: string;
  accentColor: string;
}

export const FOOD_CONSUMPTION_DURATION_MS = 5000;

export const INITIAL_FOOD_CATALOG: readonly FoodCatalogItem[] = [
  {
    id: 'water',
    name: 'Spring Water',
    category: 'drink',
    actionLabel: 'Drink',
    gerundLabel: 'Drinking',
    description:
      'Chilled mountain spring water bottled fresh at the highland sanctuary.',
    price: 5,
    icon: '💧',
    durationMs: FOOD_CONSUMPTION_DURATION_MS,
    primaryColor: '#38bdf8',
    accentColor: '#bae6fd'
  },
  {
    id: 'popcorn',
    name: 'Caramel Zoo Popcorn',
    category: 'food',
    actionLabel: 'Eat',
    gerundLabel: 'Eating',
    description:
      'Warm, crunchy golden popcorn glazed with sweet bamboo-honey caramel.',
    price: 10,
    icon: '🍿',
    durationMs: FOOD_CONSUMPTION_DURATION_MS,
    primaryColor: '#f59e0b',
    accentColor: '#fef08a'
  },
  {
    id: 'ice-cream',
    name: 'Panda Swirl Ice Cream',
    category: 'food',
    actionLabel: 'Eat',
    gerundLabel: 'Eating',
    description:
      'Creamy vanilla and dark chocolate swirl served in a crispy waffle cone.',
    price: 12,
    icon: '🍦',
    durationMs: FOOD_CONSUMPTION_DURATION_MS,
    primaryColor: '#fdf4ff',
    accentColor: '#d97706'
  },
  {
    id: 'bubble-tea',
    name: 'Brown Sugar Bubble Tea',
    category: 'drink',
    actionLabel: 'Drink',
    gerundLabel: 'Drinking',
    description:
      'Silky roasted oolong milk tea with chewy brown sugar tapioca pearls.',
    price: 15,
    icon: '🧋',
    durationMs: FOOD_CONSUMPTION_DURATION_MS,
    primaryColor: '#d69e66',
    accentColor: '#3f2314'
  },
  {
    id: 'burger',
    name: 'Bamboo Grove Burger',
    category: 'food',
    actionLabel: 'Eat',
    gerundLabel: 'Eating',
    description:
      'Savory grilled garden patty with cheddar, crisp lettuce, and house sauce on brioche.',
    price: 20,
    icon: '🍔',
    durationMs: FOOD_CONSUMPTION_DURATION_MS,
    primaryColor: '#d97706',
    accentColor: '#22c55e'
  }
];

export const FOOD_CATALOG_BY_ID: Readonly<Record<FoodItemId, FoodCatalogItem>> = {
  water: INITIAL_FOOD_CATALOG[0]!,
  popcorn: INITIAL_FOOD_CATALOG[1]!,
  'ice-cream': INITIAL_FOOD_CATALOG[2]!,
  'bubble-tea': INITIAL_FOOD_CATALOG[3]!,
  burger: INITIAL_FOOD_CATALOG[4]!
};

export const VALID_FOOD_ITEM_IDS: readonly FoodItemId[] = [
  'water',
  'bubble-tea',
  'ice-cream',
  'burger',
  'popcorn'
];

export function isValidFoodItemId(val: unknown): val is FoodItemId {
  return (
    typeof val === 'string' &&
    (VALID_FOOD_ITEM_IDS as readonly string[]).includes(val)
  );
}

export function getFoodCatalogItem(itemId: FoodItemId): FoodCatalogItem {
  return FOOD_CATALOG_BY_ID[itemId];
}

