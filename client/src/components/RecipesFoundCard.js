import React from 'react';

const RecipesFoundCard = ({ count = 4, onClearAll, onCollapseExpand, expanded = false }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      whiteSpace: 'nowrap', // Prevent wrapping
      marginBottom: '1rem'
    }}>
      {/* Expand/Collapse button */}
      <button
        onClick={onCollapseExpand}
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#1e40af',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
        title={expanded ? "Collapse all recipe details" : "Expand all recipe details"}
      >
        {expanded ? '▼' : '▶'}
      </button>

      {/* Text on single line */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap' // Prevent wrapping
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Recipes Found
        </span>
        <span style={{
          fontSize: '13px',
          color: '#6b7280'
        }}>
          ({count} recipe{count !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Clear/Delete button */}
      <button
        onClick={onClearAll}
        style={{
          marginLeft: 'auto',
          width: '32px',
          height: '32px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          fontSize: '14px'
        }}
        title="Clear all recipes from the list"
      >
        🗑️
      </button>
    </div>
  );
};

// Even more compact single-line version
export const CompactRecipesFound = ({ count = 4, onClearAll, onCollapseExpand, expanded = false }) => {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '13px',
      whiteSpace: 'nowrap',
      gap: '8px'
    }}>
      <button
        onClick={onCollapseExpand}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#3b82f6',
          fontSize: '12px',
          padding: 0
        }}
      >
        {expanded ? '▼' : '▶'}
      </button>

      <span style={{ fontWeight: '600', color: '#1f2937' }}>
        Recipes Found
      </span>
      <span style={{ color: '#6b7280', marginLeft: '4px' }}>
        ({count} recipe{count !== 1 ? 's' : ''})
      </span>

      {onClearAll && (
        <button
          onClick={onClearAll}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            marginLeft: '8px'
          }}
        >
          🗑️
        </button>
      )}
    </div>
  );
};

export default RecipesFoundCard;