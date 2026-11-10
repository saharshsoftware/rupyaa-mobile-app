import { appConfig } from './appConfig';

const PRODUCT_CODE = 'RUPYAA';

export const apiHeaders = {
  getCommon: () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Platform': appConfig.platform,
    'X-Product-Code': PRODUCT_CODE,
    'User-Agent': `${appConfig.appName}/${appConfig.appVersion} (${appConfig.platform})`,
    // only for development
    ...(__DEV__ ? { 'X-Postman-Debug': 'true' } : {}),
  }),
};
