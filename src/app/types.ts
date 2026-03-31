export interface TeamMember {
  id: string;
  name: string;
  color: string;
  bgColor: string;
}

export interface StepEntry {
  memberId: string;
  date: string; // YYYY-MM-DD
  steps: number;
  proofDriveFileId?: string;
  proofDriveUrl?: string;
  hasLocalProof?: boolean;
}

export interface AddStepModalState {
  isOpen: boolean;
  memberId?: string;
  date?: string;
}

export interface DriveConfig {
  clientId: string;
  folderId?: string;
  folderName?: string;
}

export interface ExcelRowParsed {
  rowIndex: number;
  rawName: string;
  matchedMemberId: string | null;
  date: string | null;
  steps: number | null;
  error?: string;
  isValid: boolean;
}

export interface ExcelImportResult {
  success: number;
  skipped: number;
  errors: number;
}
