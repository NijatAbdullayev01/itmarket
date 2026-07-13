export type BarcodeAssignment = {
  id: string;
  barcode: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
};

export function assertUniqueActiveBarcode(
  assignments: readonly BarcodeAssignment[],
  candidate: BarcodeAssignment,
): void {
  if (candidate.status !== 'ACTIVE' || candidate.barcode === null) return;
  const duplicate = assignments.some(
    (assignment) =>
      assignment.id !== candidate.id &&
      assignment.status === 'ACTIVE' &&
      assignment.barcode === candidate.barcode,
  );
  if (duplicate) throw new Error('Active barcode must be unique');
}
