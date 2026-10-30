// Scenic persona backgrounds for the Say tab — day image in light mode, night
// in dark. Shared by the lobby cards and the per-persona screen. Metro needs
// static requires, so each asset is listed explicitly.
import type { SayPersonaId } from './startSayChat'

export const SAY_IMAGES: Record<SayPersonaId, { day: number; night: number }> = {
  kind:   { day: require('../../../assets/images/say-kind-day.jpg'),   night: require('../../../assets/images/say-kind-night.jpg') },
  still:  { day: require('../../../assets/images/say-still-day.jpg'),  night: require('../../../assets/images/say-still-night.jpg') },
  steady: { day: require('../../../assets/images/say-steady-day.jpg'), night: require('../../../assets/images/say-steady-night.jpg') },
  wise:   { day: require('../../../assets/images/say-wise-day.jpg'),   night: require('../../../assets/images/say-wise-night.jpg') },
}
