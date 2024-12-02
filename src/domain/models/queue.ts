import { ContentVideoY2Mate, InfoY2MateClass } from '../../services/y2mate';

export type SongQueue = {
  thumbnail: string;
  url?: string;
  highAudio: ContentVideoY2Mate;
  info: InfoY2MateClass
  title: string;
}
