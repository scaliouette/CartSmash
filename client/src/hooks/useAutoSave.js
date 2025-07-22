// client/src/hooks/useAutoSave.js
import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'cart-smash-';
const DEBOUNCE_DELAY = 1000; // 1 second

// Hook for grocery list auto-save
export function useGroceryListAutoSave(inputText) {
  const [draft, setDraft] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const savedDraft = localStorage.getItem(`${STORAGE_PREFIX}grocery-list-draft`);
        if (savedDraft) {
          const parsedDraft = JSON.parse(savedDraft);
          setDraft(parsedDraft);
          
          // Only show banner if draft is not empty and not too old
          const draftAge = Date.now() - new Date(parsedDraft.timestamp).getTime();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          
          if (parsedDraft.content && parsedDraft.content.trim() && draftAge < oneWeek) {
            setShowDraftBanner(true);
          }
        }
      } catch (error) {
        console.warn('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, []);

  // Save draft with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      if (inputText && inputText.trim()) {
        try {
          const draftData = {
            content: inputText,
            timestamp: new Date().toISOString(),
            itemCount: inputText.split('\n').filter(line => line.trim()).length
          };
          
          localStorage.setItem(
            `${STORAGE_PREFIX}grocery-list-draft`,
            JSON.stringify(draftData)
          );
          
          setDraft(draftData);
          console.log('💾 Draft auto-saved');
        } catch (error) {
          console.warn('Failed to save draft:', error);
        }
      }
    }, DEBOUNCE_DELAY);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [inputText]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}grocery-list-draft`);
      setDraft(null);
      setShowDraftBanner(false);
      console.log('🗑️ Draft cleared');
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }, []);

  return {
    draft,
    clearDraft,
    showDraftBanner,
    setShowDraftBanner
  };
}

// Hook for general form auto-save
export function useAutoSave(key, value, options = {}) {
  const {
    delay = 1000,
    onSave = null,
    onRestore = null,
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  const [isRestored, setIsRestored] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load saved value on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (saved && onRestore) {
        const restored = deserialize(saved);
        onRestore(restored);
        setIsRestored(true);
      }
    } catch (error) {
      console.warn(`Failed to restore ${key}:`, error);
    }
  }, [key, onRestore, deserialize]);

  // Save value with debouncing
  useEffect(() => {
    if (!isRestored) return; // Don't save until after restoration

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        if (value !== null && value !== undefined && value !== '') {
          const serialized = serialize(value);
          localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
          
          if (onSave) {
            onSave(value);
          }
        }
      } catch (error) {
        console.warn(`Failed to save ${key}:`, error);
      }
    }, delay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [key, value, delay, onSave, serialize, isRestored]);

  // Clear saved value
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.warn(`Failed to clear ${key}:`, error);
    }
  }, [key]);

  return { clear, isRestored };
}

// Hook for saving cart items
export function useCartAutoSave(cartItems, userId) {
  const key = userId ? `cart-${userId}` : 'cart-guest';

  useAutoSave(key, cartItems, {
    delay: 2000, // Save less frequently for cart items
    onSave: (items) => {
      console.log(`💾 Cart saved: ${items.length} items`);
    }
  });
}

// Hook for saving user preferences
export function usePreferencesAutoSave(preferences) {
  useAutoSave('preferences', preferences, {
    delay: 500,
    onSave: () => {
      console.log('⚙️ Preferences saved');
    }
  });
}

export default useAutoSave;