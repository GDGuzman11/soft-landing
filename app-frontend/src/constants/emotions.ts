/**
 * Catalog of the five top-level emotions the user can pick on the
 * check-in screen, plus a typed list of their identifiers.
 */
import type { Emotion, EmotionId } from '../types';

/**
 * Stable order of emotion identifiers. Use this constant as the source of
 * truth for any UI that needs to iterate emotions in display order.
 */
export const EMOTION_IDS = ['sad', 'neutral', 'stressed', 'tired', 'good'] as const satisfies readonly EmotionId[];

/**
 * Full emotion catalog. Colors are the brand palette agreed for v1.
 * `subEmotions` is reserved for future premium expansion.
 */
export const EMOTIONS: readonly Emotion[] = [
  {
    id: 'sad',
    label: 'Sad',
    color: '#B0BEC5',
    subEmotions: [],
  },
  {
    id: 'neutral',
    label: 'Neutral',
    color: '#D4C5B0',
    subEmotions: [],
  },
  {
    id: 'stressed',
    label: 'Stressed',
    color: '#E8A598',
    subEmotions: [],
  },
  {
    id: 'tired',
    label: 'Tired',
    color: '#C5B8D4',
    subEmotions: [],
  },
  {
    id: 'good',
    label: 'Good',
    color: '#A8C5A0',
    subEmotions: [],
  },
] as const;
