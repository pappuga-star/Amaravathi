import { HEADER_HEIGHT } from '../constants/layout';
import { Z_INDEX } from '../constants/zIndex';

export const STICKY_IN_CONTENT = {
  position: 'sticky' as const,
  top: 0,
  zIndex: Z_INDEX.sticky,
};

export const STICKY_BELOW_HEADER = {
  position: 'sticky' as const,
  top: HEADER_HEIGHT,
  zIndex: Z_INDEX.sticky,
};

export const FIXED_BELOW_HEADER = {
  position: 'fixed' as const,
  top: HEADER_HEIGHT,
  zIndex: Z_INDEX.sticky,
};

