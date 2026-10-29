import { appIcon } from '@/lib/app-icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS redondea solo: va sin bordes redondeados
export default function AppleIcon() {
  return appIcon(180, { rounded: false });
}
