import { Platform } from 'react-native';
import { PermissionDefinition, PlatformAvailability } from '@/src/types/permissions';
import {
  getByPassSmsPermission,
  getEnableUpfrontContactsPermission,
} from '@/src/config/resolvedAppConfig';

/**
 * Check if a permission is available on the current platform
 */
function isAvailableOnPlatform(platform: PlatformAvailability): boolean {
  if (platform === 'both') return true;
  return platform === Platform.OS;
}

const CONTACTS_PERMISSION_DEFINITION: PermissionDefinition = {
  id: 'contacts',
  title: 'Contacts',
  description:
    'Rupyaa needs access to your device contacts so you can invite friends.',
  platform: 'both',
};

const BASE_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    id: 'location',
    title: 'Location',
    description:
      'This app collects location details one-time to fetch your current location (latitude/longitude) instantly serviceability, verify your current address expediting the KYC process and prevent fraud. We do not collect location when the app is in the background.',
    platform: 'both',
  },
  {
    id: 'camera',
    title: 'Camera',
    description:
      'Camera access is required for capturing your selfie(s), scanning documents(ID proof, Address Proof, Your Customer) verification process. This helps us meet compliance and regulatory requirements.', platform: 'both',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description:
      'Notification access is required to keep you informed about important updates, alerts, and provisional final offers.',
    platform: 'both',
  },
  {
    id: 'appTrackingTransparency',
    title: 'App Tracking Transparency',
    description:
      'Allows us to use your device identifier to measure ad performance and show you more relevant offers. You can change this anytime in Settings > Privacy & Security > Tracking.',
    platform: 'ios',
  },
];

const SMS_PERMISSION_DEFINITION: PermissionDefinition[] = [{
  id: 'sms',
  title: 'SMS Permission',
  description:
    'This app periodically collects and transmits SMS data like sender names, SMS body and received time to our servers and third parties. This data is used to assess your income, spending pattern and your loan affordability. This helps us in quick credit assessment and help us in facilitating best offers to customers easily and at the same time prevent fraud.',
  platform: 'android',
},
{
  id: 'installedApps',
  title: 'Installed Apps',
  description:
    'This app collects metadata about installed and system applications on your device. This information is securely processed through our trusted technology partner, Credeau (www.credeau.com), which provides device-intelligence services and the data is used to detect potential fraud—such as the presence of VPNs, gaming, or other high-risk apps—and to assess your risk profile more accurately. These insights help us enable faster credit approvals and offer more suitable credit limits. The data is collected only after your explicit consent and is handled securely in accordance with applicable privacy policies.',
  platform: 'android',
},
{
  id: 'deviceMetadata',
  title: 'Device Metadata',
  description: 'This app collects and monitors specific information about your device like device brand, model, OS and version, user profile information, Network and SIM information, Mac Address for the device to ensure that customer identity is not compromised and we can prevent organized fraud. We do not collect any unique device identifiers like IMEI and serial number.',
  platform: 'android',
},
{
  id: 'phoneState',
  title: 'Phone State',
  description:
    'This app collects phone state information during onboarding and periodically during data sync to check SIM status and network strength. This helps us optimise data collection and detect potential fraud. All checks are performed on your device - no personal identifiers are sent to our servers. We do not collect contacts or call logs.',
  platform: 'android',
},
];

/**
 * Permission definitions with platform-specific availability.
 * SMS is included on Android only when byPassSmsPermission is false (from app-config or static fallback).
 */
export function getPermissionDefinitions(): PermissionDefinition[] {
  const showSmsPermission = !getByPassSmsPermission();
  const shouldIncludeSms = Platform.OS === 'android' && showSmsPermission;
  const shouldIncludeContacts = getEnableUpfrontContactsPermission();

  let definitions: PermissionDefinition[] = shouldIncludeSms
    ? [...SMS_PERMISSION_DEFINITION, ...BASE_PERMISSION_DEFINITIONS]
    : BASE_PERMISSION_DEFINITIONS;

  if (shouldIncludeContacts) {
    definitions = [...definitions, CONTACTS_PERMISSION_DEFINITION];
  }

  return definitions;
}

/**
 * Get permissions available on the current platform
 */
export function getAvailablePermissions(): PermissionDefinition[] {
  return getPermissionDefinitions().filter((permission) =>
    isAvailableOnPlatform(permission.platform)
  );
}
