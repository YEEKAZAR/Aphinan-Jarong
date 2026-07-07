import { useState, useCallback } from 'react';

const IGNORE_LIST_STORAGE_KEY = 'thai-spell-checker-ignore-list';

export const useIgnoreList = (): [
  string[],
  (word: string) => void,
  (word: string) => void
] => {
  const [ignoreList, setIgnoreList] = useState<string[]>(() => {
    try {
      const storedList = localStorage.getItem(IGNORE_LIST_STORAGE_KEY);
      return storedList ? JSON.parse(storedList) : [];
    } catch (error) {
      console.error("Failed to parse ignore list from localStorage", error);
      return [];
    }
  });

  const persistList = (list: string[]) => {
    try {
      localStorage.setItem(IGNORE_LIST_STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      console.error("Failed to save ignore list to localStorage", error);
    }
  };

  const addWord = useCallback((word: string) => {
    const trimmedWord = word.trim().toLowerCase();
    if (trimmedWord && !ignoreList.includes(trimmedWord)) {
      setIgnoreList(prevList => {
        const newList = [...prevList, trimmedWord].sort();
        persistList(newList);
        return newList;
      });
    }
  }, [ignoreList]);

  const removeWord = useCallback((word: string) => {
    const wordToRemove = word.toLowerCase();
    setIgnoreList(prevList => {
      const newList = prevList.filter(item => item !== wordToRemove);
      persistList(newList);
      return newList;
    });
  }, []);

  return [ignoreList, addWord, removeWord];
};
