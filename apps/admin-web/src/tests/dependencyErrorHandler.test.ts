import { describe, expect, it, vi } from 'vitest';
import { showLinkedRecordsNotification } from '../utils/dependency-error-handler';
import { ApiError } from '../lib/api';

describe('showLinkedRecordsNotification helper', () => {
  it('correctly handles dependency errors and triggers the custom toast', () => {
    const errorPayload = {
      success: false,
      code: 'LINKED_RECORDS_EXIST',
      entity: 'customer',
      message: 'Cannot delete customer because related custom tea formulas exist.',
      data: {
        recordId: '6a09ac896e25d36be5937c77',
        recordName: 'Sri Rama Tea Stall',
        dependencyType: 'customerTeaFormulas',
        dependencyCount: 4,
        actionLabel: 'View Formulas',
        redirectUrl: '/taste-customization?tab=saved-formulas&q=Sri%20Rama%20Tea%20Stall',
      },
    };

    const error = new ApiError(errorPayload.message, 400, errorPayload);

    const mockNavigate = vi.fn();
    const mockShowToast = vi.fn();
    const mockShowError = vi.fn();

    showLinkedRecordsNotification(error, mockNavigate, mockShowToast, mockShowError);

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledTimes(1);

    const [message, type, options] = mockShowToast.mock.calls[0];
    expect(type).toBe('warning');
    expect(options.title).toBe('Cannot Delete Customer');
    expect(message).toBe(
      'This customer has 4 active custom tea formulas that must be removed first.',
    );
    expect(options.action.label).toBe('View Formulas');

    // Trigger action click and verify navigate
    options.action.onClick();
    expect(mockNavigate).toHaveBeenCalledWith(errorPayload.data.redirectUrl);
  });

  it('blocks unsafe open redirects and falls back to showError', () => {
    const errorPayload = {
      success: false,
      code: 'LINKED_RECORDS_EXIST',
      entity: 'customer',
      message: 'Cannot delete customer.',
      data: {
        recordId: '12345',
        recordName: 'Sri Rama Tea Stall',
        dependencyType: 'customerTeaFormulas',
        dependencyCount: 2,
        actionLabel: 'View Formulas',
        redirectUrl: 'http://malicious-external-site.com',
      },
    };

    const error = new ApiError(errorPayload.message, 400, errorPayload);

    const mockNavigate = vi.fn();
    const mockShowToast = vi.fn();
    const mockShowError = vi.fn();

    showLinkedRecordsNotification(error, mockNavigate, mockShowToast, mockShowError);

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith(error);
  });

  it('falls back to standard showError if the error is not a dependency error', () => {
    const error = new Error('Standard database failure');
    const mockNavigate = vi.fn();
    const mockShowToast = vi.fn();
    const mockShowError = vi.fn();

    showLinkedRecordsNotification(error, mockNavigate, mockShowToast, mockShowError);

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith(error);
  });
});
