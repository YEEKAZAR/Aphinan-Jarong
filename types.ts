export interface Correction {
  original: string;
  correction: string;
  explanation: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  originalText: string;
  correctedText: string;
  corrections: Correction[];
}
