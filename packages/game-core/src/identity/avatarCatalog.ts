import type {
  AccessoryId,
  AvatarAppearance,
  HairColorId,
  HairstyleId,
  OutfitId,
  SkinToneId
} from '../types';

export interface SkinToneCatalogItem {
  id: SkinToneId;
  label: string;
  hex: string;
}

export interface HairstyleCatalogItem {
  id: HairstyleId;
  label: string;
  description: string;
}

export interface HairColorCatalogItem {
  id: HairColorId;
  label: string;
  hex: string;
}

export interface OutfitCatalogItem {
  id: OutfitId;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface AccessoryCatalogItem {
  id: AccessoryId;
  label: string;
  description: string;
}

export interface AvatarCustomizationCatalog {
  skinTones: readonly SkinToneCatalogItem[];
  hairstyles: readonly HairstyleCatalogItem[];
  hairColors: readonly HairColorCatalogItem[];
  outfits: readonly OutfitCatalogItem[];
  accessories: readonly AccessoryCatalogItem[];
}

export const AVATAR_CUSTOMIZATION_CATALOG: AvatarCustomizationCatalog = {
  skinTones: [
    { id: 'warm-ivory', label: 'Warm Ivory', hex: '#f6d7c3' },
    { id: 'golden-sand', label: 'Golden Sand', hex: '#eab68c' },
    { id: 'amber-tan', label: 'Amber Tan', hex: '#cf9265' },
    { id: 'rich-sienna', label: 'Rich Sienna', hex: '#9f633d' },
    { id: 'deep-umber', label: 'Deep Umber', hex: '#633b24' },
    { id: 'bamboo-sage', label: 'Bamboo Sage', hex: '#9ccf9f' }
  ],
  hairstyles: [
    { id: 'explorer-bob', label: 'Explorer Bob', description: 'Classic rounded adventure cut' },
    { id: 'sun-spiky', label: 'Sun Spiky', description: 'Breezy tousled crown spikes' },
    { id: 'bamboo-ponytail', label: 'Bamboo Ponytail', description: 'High trail ponytail' },
    { id: 'park-bun', label: 'Park Keeper Bun', description: 'Neat top knot bun' }
  ],
  hairColors: [
    { id: 'espresso-black', label: 'Espresso Black', hex: '#241c18' },
    { id: 'chestnut-brown', label: 'Chestnut Brown', hex: '#5c3824' },
    { id: 'golden-blonde', label: 'Golden Blonde', hex: '#e2b857' },
    { id: 'copper-auburn', label: 'Copper Auburn', hex: '#a84628' },
    { id: 'silver-mist', label: 'Silver Mist', hex: '#d4dce3' },
    { id: 'forest-teal', label: 'Forest Teal', hex: '#1e7a6d' }
  ],
  outfits: [
    {
      id: 'ranger-emerald',
      label: 'Emerald Ranger',
      primary: '#2f6f4e',
      secondary: '#1e3f2f',
      accent: '#10b981'
    },
    {
      id: 'safari-khaki',
      label: 'Safari Khaki',
      primary: '#b89d6f',
      secondary: '#524432',
      accent: '#f59e0b'
    },
    {
      id: 'botanist-cobalt',
      label: 'Botanist Cobalt',
      primary: '#28559a',
      secondary: '#1c2f4f',
      accent: '#3b82f6'
    },
    {
      id: 'sunset-coral',
      label: 'Sunset Coral',
      primary: '#b84a39',
      secondary: '#4a2623',
      accent: '#ec4899'
    },
    {
      id: 'panda-monochrome',
      label: 'Panda Monochrome',
      primary: '#2d3138',
      secondary: '#16181c',
      accent: '#14b8a6'
    }
  ],
  accessories: [
    { id: 'safari-hat', label: 'Safari Hat', description: 'Wide-brim sun hat with accent band' },
    { id: 'bamboo-visor', label: 'Bamboo Visor', description: 'Sporty shade visor cap' },
    { id: 'round-glasses', label: 'Round Glasses', description: 'Stylized botanist spectacles' },
    { id: 'explorer-backpack', label: 'Field Pack', description: 'Expedition rucksack with bedroll' },
    { id: 'none', label: 'No Accessory', description: 'Unobstructed hairstyle view' }
  ]
} as const;

export const DEFAULT_AVATAR_APPEARANCE: AvatarAppearance = {
  skinTone: 'golden-sand',
  hairstyle: 'explorer-bob',
  hairColor: 'chestnut-brown',
  outfit: 'ranger-emerald',
  accessory: 'safari-hat'
};

const VALID_SKIN_TONES = new Set<string>(AVATAR_CUSTOMIZATION_CATALOG.skinTones.map((i) => i.id));
const VALID_HAIRSTYLES = new Set<string>(AVATAR_CUSTOMIZATION_CATALOG.hairstyles.map((i) => i.id));
const VALID_HAIR_COLORS = new Set<string>(AVATAR_CUSTOMIZATION_CATALOG.hairColors.map((i) => i.id));
const VALID_OUTFITS = new Set<string>(AVATAR_CUSTOMIZATION_CATALOG.outfits.map((i) => i.id));
const VALID_ACCESSORIES = new Set<string>(
  AVATAR_CUSTOMIZATION_CATALOG.accessories.map((i) => i.id)
);

export function isValidSkinToneId(value: unknown): value is SkinToneId {
  return typeof value === 'string' && VALID_SKIN_TONES.has(value);
}

export function isValidHairstyleId(value: unknown): value is HairstyleId {
  return typeof value === 'string' && VALID_HAIRSTYLES.has(value);
}

export function isValidHairColorId(value: unknown): value is HairColorId {
  return typeof value === 'string' && VALID_HAIR_COLORS.has(value);
}

export function isValidOutfitId(value: unknown): value is OutfitId {
  return typeof value === 'string' && VALID_OUTFITS.has(value);
}

export function isValidAccessoryId(value: unknown): value is AccessoryId {
  return typeof value === 'string' && VALID_ACCESSORIES.has(value);
}

export function isValidAvatarAppearance(candidate: unknown): candidate is AvatarAppearance {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    isValidSkinToneId(obj.skinTone) &&
    isValidHairstyleId(obj.hairstyle) &&
    isValidHairColorId(obj.hairColor) &&
    isValidOutfitId(obj.outfit) &&
    isValidAccessoryId(obj.accessory)
  );
}

export function sanitizeAvatarAppearance(candidate: unknown): AvatarAppearance {
  if (!candidate || typeof candidate !== 'object') {
    return { ...DEFAULT_AVATAR_APPEARANCE };
  }
  const obj = candidate as Record<string, unknown>;
  return {
    skinTone: isValidSkinToneId(obj.skinTone)
      ? obj.skinTone
      : DEFAULT_AVATAR_APPEARANCE.skinTone,
    hairstyle: isValidHairstyleId(obj.hairstyle)
      ? obj.hairstyle
      : DEFAULT_AVATAR_APPEARANCE.hairstyle,
    hairColor: isValidHairColorId(obj.hairColor)
      ? obj.hairColor
      : DEFAULT_AVATAR_APPEARANCE.hairColor,
    outfit: isValidOutfitId(obj.outfit)
      ? obj.outfit
      : DEFAULT_AVATAR_APPEARANCE.outfit,
    accessory: isValidAccessoryId(obj.accessory)
      ? obj.accessory
      : DEFAULT_AVATAR_APPEARANCE.accessory
  };
}

export function getSkinToneHex(skinToneId: SkinToneId): string {
  const found = AVATAR_CUSTOMIZATION_CATALOG.skinTones.find((item) => item.id === skinToneId);
  return found ? found.hex : '#eab68c';
}

export function getHairColorHex(hairColorId: HairColorId): string {
  const found = AVATAR_CUSTOMIZATION_CATALOG.hairColors.find((item) => item.id === hairColorId);
  return found ? found.hex : '#5c3824';
}

export function getOutfitColors(outfitId: OutfitId): {
  primary: string;
  secondary: string;
  accent: string;
} {
  const found = AVATAR_CUSTOMIZATION_CATALOG.outfits.find((item) => item.id === outfitId);
  if (!found) {
    return { primary: '#2f6f4e', secondary: '#1e3f2f', accent: '#10b981' };
  }
  return { primary: found.primary, secondary: found.secondary, accent: found.accent };
}

