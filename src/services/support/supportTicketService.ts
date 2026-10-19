import { z } from 'zod';
import { API_ENDPOINTS, BANK_STATEMENT_UPLOAD_TIMEOUT_MS } from '@/src/config/api';
import { apiClient } from '@/src/services/api/apiClient';
import type { ApiResponse } from '@/src/types/api';
import type {
  CreateCustomerTicketParams,
  CreateCustomerTicketRequest,
  CreateCustomerTicketResponse,
  TicketFilterOptions,
} from '@/src/types/support';
import type { DocumentFile } from '@/src/utils/documentFilePicker';

function buildJsonBody(
  params: CreateCustomerTicketParams
): CreateCustomerTicketRequest {
  const body: CreateCustomerTicketRequest = {
    phoneNumber: params.phoneNumber,
    subject: params.subject,
    categoryId: params.categoryId,
  };

  const description = params.description?.trim();
  if (description) {
    body.description = description;
  }


  const applicationNumber = params.applicationNumber?.trim();
  if (applicationNumber) {
    body.applicationNumber = applicationNumber;
  }

  return body;
}

function appendScalarFields(formData: FormData, params: CreateCustomerTicketParams): void {
  formData.append('phoneNumber', params.phoneNumber);
  formData.append('subject', params.subject);

  const description = params.description?.trim();
  if (description) {
    formData.append('description', description);
  }

  formData.append('categoryId', params.categoryId);

  const applicationNumber = params.applicationNumber?.trim();
  if (applicationNumber) {
    formData.append('applicationNumber', applicationNumber);
  }
}

function appendFiles(formData: FormData, files: DocumentFile[]): void {
  for (const file of files) {
    formData.append(
      'files',
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob
    );
  }
}

/**
 * Creates a customer support ticket (POST /tickets/customer).
 * Uses multipart FormData when files are present; otherwise JSON.
 */
export async function createCustomerTicket(
  params: CreateCustomerTicketParams
): Promise<ApiResponse<CreateCustomerTicketResponse>> {
  const files = params.files ?? [];

  if (files.length > 0) {
    const formData = new FormData();
    appendScalarFields(formData, params);
    appendFiles(formData, files);

    return apiClient.post<CreateCustomerTicketResponse>(
      API_ENDPOINTS.tickets.createCustomerTicket,
      formData,
      { timeoutMs: BANK_STATEMENT_UPLOAD_TIMEOUT_MS }
    );
  }

  return apiClient.post<CreateCustomerTicketResponse>(
    API_ENDPOINTS.tickets.createCustomerTicket,
    buildJsonBody(params)
  );
}

const filterOptionsSchema = z.object({
  categories: z.array(z.object({ _id: z.string().min(1), name: z.string().min(1) })),
});

export async function getTicketFilterOptions(): Promise<ApiResponse<TicketFilterOptions>> {
  const response = await apiClient.get<unknown>(API_ENDPOINTS.tickets.filterOptions);
  if (!response.success) return response;

  // The web endpoint supports both direct and data-wrapped category responses.
  const parsed = z.union([
    filterOptionsSchema,
    z.object({ data: filterOptionsSchema }).transform(value => value.data),
  ]).safeParse(response.data);
  if (!parsed.success) {
    return { success: false, error: { message: 'Unable to load support issues.' } };
  }
  return { ...response, data: parsed.data };
}
