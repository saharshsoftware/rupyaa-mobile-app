import type { DocumentFile } from '@/src/utils/documentFilePicker';

/** Scalar fields sent to POST /tickets/customer. */
export interface CreateCustomerTicketRequest {
  phoneNumber: string;
  subject: string;
  description?: string;
  categoryId: string;
  applicationNumber?: string;
}

/** Params for creating a ticket including optional file attachments. */
export interface CreateCustomerTicketParams extends CreateCustomerTicketRequest {
  files?: DocumentFile[];
}

export interface CreateCustomerTicketResponse {
  message?: string;
  [key: string]: unknown;
}

export interface TicketCategory {
  _id: string;
  name: string;
}

export interface TicketFilterOptions {
  categories: TicketCategory[];
}
