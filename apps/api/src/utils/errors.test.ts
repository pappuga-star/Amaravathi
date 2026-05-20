import { describe, it, expect } from 'vitest';
import { throwLinkedRecordsError, LinkedRecordsError } from './errors.js';

describe('LinkedRecordsError & throwLinkedRecordsError', () => {
  it('correctly constructs LinkedRecordsError with structured data', () => {
    const params = {
      entity: 'customer',
      message: 'Cannot delete customer because related custom tea formulas exist.',
      recordId: '12345',
      recordName: 'Sri Rama Tea Stall',
      dependencyType: 'customerTeaFormulas',
      dependencyCount: 5,
      actionLabel: 'View Formulas',
      redirectUrl: '/taste-customization?tab=saved-formulas&q=Sri%20Rama%20Tea%20Stall',
    };

    try {
      throwLinkedRecordsError(params);
      // If no throw, fail the test
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(LinkedRecordsError);
      expect(error.status).toBe(400);
      expect(error.code).toBe('LINKED_RECORDS_EXIST');
      expect(error.entity).toBe('customer');
      expect(error.message).toBe(params.message);
      expect(error.data).toEqual({
        recordId: params.recordId,
        recordName: params.recordName,
        dependencyType: params.dependencyType,
        dependencyCount: params.dependencyCount,
        actionLabel: params.actionLabel,
        redirectUrl: params.redirectUrl,
      });
    }
  });
});
