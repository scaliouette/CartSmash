// client/src/hooks/useAutoSave.js
import { useState, useEffect, useCallback, useRef } from 'react';

// Constants
const DRAFT_KEY = 'cart-smash-draft';
const AUTO_SAVE_DELAY = 1000; // 1 second delay
const MIN_CONTENT_LENGTH = 5; // Minimum characters to save

// Generic auto-save hook
export function useAutoSave(value, key, delay = AUTO_SAVE_DELAY) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't save empty values
    if (!value || value.length < MIN_CONTENT_LENGTH) {
      return;
    }

    // Set up new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setError(null);

      try {
        localStorage.setItem(key, JSON.stringify({
          value,
          timestamp: new Date().toISOString()
        }));
        setLastSaved(new Date());
        console.log(`✅ Auto-saved to ${key}`);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setError(err);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, key, delay]);

  // Load saved value
  const loadSaved = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load saved value:', err);
      setError(err);
    }
    return null;
  }, [key]);

  // Clear saved value
  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setLastSaved(null);
      console.log(`🗑️ Cleared saved data for ${key}`);
    } catch (err) {
      console.error('Failed to clear saved value:', err);
      setError(err);
    }
  }, [key]);

  return {
    isSaving,
    lastSaved,
    error,
    loadSaved,
    clearSaved
  };
}

// Specialized hook for grocery list auto-save
export function useGroceryListAutoSave(groceryList) {
  const [draft, setDraft] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const mountedRef = useRef(false);

  const { isSaving, lastSaved, error, loadSaved, clearSaved } = useAutoSave(
    groceryList,
    DRAFT_KEY,
    AUTO_SAVE_DELAY
  );

  // Load draft on mount
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      
      const savedDraft = loadSaved();
      if (savedDraft && savedDraft.value && savedDraft.value !== groceryList) {
        setDraft({
          content: savedDraft.value,
          timestamp: savedDraft.timestamp
        });
        setShowDraftBanner(true);
        console.log('📝 Found saved draft');
      }
    }
  }, [loadSaved, groceryList]);

  // Clear draft
  const clearDraft = useCallback(() => {
    clearSaved();
    setDraft(null);
    setShowDraftBanner(false);
  }, [clearSaved]);

  return {
    isSaving,
    lastSaved,
    error,
    draft,
    clearDraft,
    showDraftBanner,
    setShowDraftBanner
  };
}

// Auto-save hook for cart items
export function useCartAutoSave(cartItems, userId) {
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    // Don't sync if no items or no user
    if (!cartItems || cartItems.length === 0 || !userId) {
      return;
    }

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set up sync timeout
    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const response = await fetch('/api/cart/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-ID': userId
          },
          body: JSON.stringify({ cart: cartItems })
        });

        if (!response.ok) {
          throw new Error('Failed to sync cart');
        }

        setLastSync(new Date());
        console.log('✅ Cart synced to server');
      } catch (err) {
        console.error('Cart sync failed:', err);
        setSyncError(err);
        
        // Fall back to local storage
        try {
          localStorage.setItem(`cart-${userId}`, JSON.stringify({
            items: cartItems,
            timestamp: new Date().toISOString()
          }));
          console.log('💾 Cart saved locally as fallback');
        } catch (localErr) {
          console.error('Local save also failed:', localErr);
        }
      } finally {
        setIsSyncing(false);
      }
    }, 2000); // 2 second delay for cart sync

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [cartItems, userId]);

  return {
    isSyncing,
    lastSync,
    syncError
  };
}

// Auto-save hook for AI conversations
export function useConversationAutoSave(messages, conversationId) {
  const CONVERSATION_KEY = `ai-conversation-${conversationId}`;
  
  const { isSaving, lastSaved, error, loadSaved, clearSaved } = useAutoSave(
    messages,
    CONVERSATION_KEY,
    2000 // 2 second delay for conversations
  );

  // Load conversation history
  const loadConversation = useCallback(() => {
    const saved = loadSaved();
    if (saved && saved.value) {
      return saved.value;
    }
    return [];
  }, [loadSaved]);

  // Get all saved conversations
  const getAllConversations = useCallback(() => {
    const conversations = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ai-conversation-')) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            conversations.push({
              id: key.replace('ai-conversation-', ''),
              messages: parsed.value,
              timestamp: parsed.timestamp
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }

    return conversations.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
    loadConversation,
    clearConversation: clearSaved,
    getAllConversations
  };
}

// Settings auto-save hook - Also exported as usePreferencesAutoSave for compatibility
export function useSettingsAutoSave(settings) {
  const SETTINGS_KEY = 'cart-smash-settings';
  
  const { isSaving, lastSaved, error, loadSaved, clearSaved } = useAutoSave(
    settings,
    SETTINGS_KEY,
    500 // Quick save for settings
  );

  // Load settings with defaults
  const loadSettings = useCallback(() => {
    const saved = loadSaved();
    if (saved && saved.value) {
      return saved.value;
    }
    
    // Return default settings
    return {
      theme: 'light',
      autoParseClipboard: false,
      defaultUnit: 'each',
      enableKrogerValidation: true,
      showConfidenceScores: true,
      enableAutoSave: true,
      ingredientChoice: 'basic'
    };
  }, [loadSaved]);

  return {
    isSaving,
    lastSaved,
    error,
    loadSettings,
    resetSettings: clearSaved
  };
}

// Export with alternative name for compatibility
export const usePreferencesAutoSave = useSettingsAutoSave;

export default useAutoSave;