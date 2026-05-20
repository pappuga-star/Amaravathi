export class LinkedRecordsError extends Error {
  status: number;
  code: string;
  entity: string;
  data: {
    recordId: string;
    recordName: string;
    dependencyType: string;
    dependencyCount: number;
    actionLabel: string;
    redirectUrl: string;
  };

  constructor(params: {
    entity: string;
    message: string;
    recordId: string;
    recordName: string;
    dependencyType: string;
    dependencyCount: number;
    actionLabel: string;
    redirectUrl: string;
  }) {
    super(params.message);
    this.name = 'LinkedRecordsError';
    this.status = 400;
    this.code = 'LINKED_RECORDS_EXIST';
    this.entity = params.entity;
    this.data = {
      recordId: params.recordId,
      recordName: params.recordName,
      dependencyType: params.dependencyType,
      dependencyCount: params.dependencyCount,
      actionLabel: params.actionLabel,
      redirectUrl: params.redirectUrl,
    };
    Object.setPrototypeOf(this, LinkedRecordsError.prototype);
  }
}

export function throwLinkedRecordsError(params: {
  entity: string;
  message: string;
  recordId: string;
  recordName: string;
  dependencyType: string;
  dependencyCount: number;
  actionLabel: string;
  redirectUrl: string;
}): never {
  throw new LinkedRecordsError(params);
}
