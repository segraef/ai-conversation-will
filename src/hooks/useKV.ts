import { useState, useEffect } from 'react';

// A simple implementation of the useKV hook that uses localStorage for persistence
// This is a placeholder that will be replaced by the actual @github/spark/hooks implementation
export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      // Initialize from localStorage if available
      const item = window.localStorage.getItem(`kv-${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return defaultValue;
    }
  });

  // Sync with localStorage on changes
  useEffect(() => {
    try {
      window.localStorage.setItem(`kv-${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  }, [key, value]);

  // Function to update the value
  const updateValue = (newValueOrFunction: T | ((prev: T) => T)) => {
    setValue(prev => {
      const newValue = typeof newValueOrFunction === 'function'
        ? (newValueOrFunction as ((prev: T) => T))(prev)
        : newValueOrFunction;
      
      return newValue;
    });
  };

  // Function to delete the value
  const deleteValue = () => {
    try {
      window.localStorage.removeItem(`kv-${key}`);
      setValue(defaultValue);
    } catch (error) {
      console.error(`Error deleting localStorage for key ${key}:`, error);
    }
  };

  return [value, updateValue, deleteValue];
}