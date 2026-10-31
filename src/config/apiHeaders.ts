import { appConfig } from './appConfig';

const platformName = 'RUPYAA';

export const apiHeaders = {
  getCommon: () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Platform': appConfig.platform,
    'platform': platformName,
    'User-Agent': `${appConfig.appName}/${appConfig.appVersion} (${appConfig.platform})`,
    // only for development
    ...(__DEV__ ? { 'X-Postman-Debug': 'true' } : {}),
  }),
};
