// The mfs theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in mfs.settings.json and the generated mfs.settings.ts;
// change them with `astryx experimental theme editor set mfs ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {mfsSettings} from './mfs.settings';

export const mfsTheme = defineTheme({
  extends: mfsSettings,
  name: 'mfs',
});
