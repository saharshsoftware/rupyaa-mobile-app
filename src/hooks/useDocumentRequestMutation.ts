import { useMutation, useQueryClient } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '@/src/constants/data';
import {
  DocumentRequest,
  DocumentFile,
  UploadDocumentRequestResponse,
} from '@/src/services/user/userService';
import type { ApiResponse } from '@/src/types/api';
import { API_ENDPOINTS } from '@/src/config/api';
import { api } from '@/src/services/api/legacyFetcherApi';
import { apiClient } from '../services/api/apiClient';

export type UploadDocumentRequestVariables = {
  documentRequest: DocumentRequest;
  files: DocumentFile[];
  /** One password per file by index; use empty string for non-protected files. */
  passwords: string[];
};

/** Error shape returned by backend for password-protected or invalid password PDFs. */
export type DocumentUploadPasswordError = {
  message: string;
  passwordRequired?: boolean;
  passwordInvalid?: boolean;
  fileIndex: number;
  fileName: string;
};

async function uploadDocumentRequest(
  variables: UploadDocumentRequestVariables
): Promise<ApiResponse<UploadDocumentRequestResponse>> {
  const { documentRequest, files, passwords } = variables;

  if (files.length === 0) {
    return {
      success: false,
      error: { message: 'No files to upload' },
    };
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append(
      'documents',
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob
    );
  }
  // Passwords array must match file indices; backend expects JSON array.
  formData.append('passwords', JSON.stringify(passwords));

  const path = `${API_ENDPOINTS.user.uploadDocumentRequest}/${documentRequest._id}/attachments`;

  try {
    const data = await apiClient.post<UploadDocumentRequestResponse>(path, formData);
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to upload document request');
    }
    return { success: true, data: data.data as UploadDocumentRequestResponse };
  } catch (err: unknown) {
    const thrown = err as { message?: string; data?: Record<string, unknown> };
    const details = thrown.data ?? {};
    const message =
      typeof thrown.message === 'string'
        ? thrown.message
        : (details.message as string) ?? 'Upload failed';

    const error: Record<string, unknown> = {
      message,
      details,
    };
    if (
      typeof details.fileIndex === 'number' &&
      typeof details.fileName === 'string'
    ) {
      error.fileIndex = details.fileIndex;
      error.fileName = details.fileName;
      error.passwordRequired = details.passwordRequired === true;
      error.passwordInvalid = details.passwordInvalid === true;
    }

    return {
      success: false,
      error: {
        message,
        ...(Object.keys(details).length > 0 ? { details } : {}),
        ...(typeof details.fileIndex === 'number' && typeof details.fileName === 'string'
          ? {
              fileIndex: details.fileIndex,
              fileName: details.fileName,
              passwordRequired: details.passwordRequired === true,
              passwordInvalid: details.passwordInvalid === true,
            }
          : {}),
      },
    };
  }
}

export function useDocumentRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocumentRequest,
    onSuccess: async (data) => {
      if (data?.success) {
        await queryClient.invalidateQueries({
          queryKey: REACT_QUERY_KEYS.DOCUMENT_REQUESTS_USER,
        });
      }
    },
    onError: (err: unknown) => {
      if (__DEV__) {
        const message = err instanceof Error ? err.message : String(err);
        console.log('[useDocumentRequestMutation] error:', message);
      }
    },
  });
}
