/**
 * Shape of a contact item for the Contacts screen (dummy data / future API).
 */
export interface ContactItem {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: string[];
  photoUrl?: string | null;
  organization?: string;
  jobTitle?: string;
}

/** Single contact from GET /user/google-contacts API. */
export interface GoogleContact {
  _id?: string;
  name: string;
  phone: string;
}

/** Response data for GET /user/google-contacts (wrapped in ApiSuccess.data). */
export interface GetGoogleContactsResponse {
  contacts: GoogleContact[];
  count: number;
}

/** Contact row used for device address-book rendering. */
export interface DeviceContactRow {
  id: string;
  name: string;
  phone: string | null;
}
