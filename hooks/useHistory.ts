import { useState, useCallback } from 'react';
import type { HistoryEntry } from '../types';

const HISTORY_STORAGE_KEY = 'thai-spell-checker-history';

export const useHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error("Failed to parse history from localStorage", error);
      return [];
    }
  });

  const addHistoryEntry = useCallback((entryData: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entryData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setHistory(prevHistory => {
      const updatedHistory = [newEntry, ...prevHistory].slice(0, 50); // Keep a max of 50 entries
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
      return updatedHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage", error);
    }
  }, []);

  return { history, addHistoryEntry, clearHistory };
};
