import { ApiError } from '../lib/api';

export function showLinkedRecordsNotification(
  error: any,
  navigate: (path: string) => void,
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    options?: {
      title?: string;
      action?: { label: string; onClick: () => void };
    },
  ) => void,
  showError: (err: any) => void,
) {
  if (
    error instanceof ApiError &&
    (error.code === 'LINKED_RECORDS_EXIST' || error.code?.startsWith('LINKED_')) &&
    error.data
  ) {
    const { entity, data } = error;
    const { actionLabel, redirectUrl, dependencyType, dependencyCount } = data;

    // Safety validation of redirectUrl to prevent open redirects
    const isSafeUrl =
      redirectUrl &&
      typeof redirectUrl === 'string' &&
      redirectUrl.startsWith('/') &&
      !redirectUrl.startsWith('//');

    if (!isSafeUrl) {
      console.warn('Blocked potentially unsafe redirect URL:', redirectUrl);
      showError(error);
      return;
    }

    // Capitalize entity for title
    const entityLabel = entity
      ? entity.charAt(0).toUpperCase() + entity.slice(1)
      : 'Record';
    const title = `Cannot Delete ${entityLabel}`;

    // Map dependencyType to clean display names
    let dependencyLabel = 'related records';
    if (dependencyType === 'customerTeaFormulas') {
      dependencyLabel = 'custom tea formulas';
    } else if (dependencyType === 'purchaseBatches') {
      dependencyLabel = 'purchase batches';
    } else if (dependencyType === 'orders') {
      dependencyLabel = 'orders';
    } else if (dependencyType === 'batches') {
      dependencyLabel = 'batches';
    }

    // Construct the user-friendly action description
    const displayMessage = `This ${entity || 'record'} has ${dependencyCount ?? 'active'} active ${dependencyLabel} that must be removed first.`;

    showToast(displayMessage, 'warning', {
      title,
      action: {
        label: actionLabel || 'View Records',
        onClick: () => {
          navigate(redirectUrl);
        },
      },
    });
  } else {
    showError(error);
  }
}
