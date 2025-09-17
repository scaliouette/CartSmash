import React, { useState } from 'react';

const RecipesFound = ({ recipes }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e5e5',
      padding: '12px',
      marginBottom: '16px'
    }}>
      {/* Header with collapse button in top left */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: isExpanded ? '12px' : '0',
        gap: '8px'
      }}>
        {/* Collapse/Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '24px',
            height: '24px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            padding: 0
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        {/* Play icon */}
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#1e40af',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg
            width="14"
            height="16"
            viewBox="0 0 14 16"
            fill="white"
          >
            <path d="M0 0v16l14-8z" />
          </svg>
        </div>

        {/* Title */}
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
          ({recipes.length} recipes)
        </span>

        {/* Delete button on the right */}
        <button style={{
          marginLeft: 'auto',
          width: '28px',
          height: '28px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          color: '#6b7280'
        }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
      </div>

      {/* Recipe Cards */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recipes.map((recipe, index) => (
            <RecipeCard key={index} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
};

const RecipeCard = ({ recipe }) => {
  // Extract recipe data with fallbacks for both formats
  const title = recipe.title || recipe.name || 'Untitled Recipe';
  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];

  // Format ingredients for display
  const formatIngredients = (ingredients) => {
    if (Array.isArray(ingredients)) {
      return ingredients.slice(0, 3).map(ing => {
        if (typeof ing === 'string') return ing;
        return ing.name || ing.item || ing.original || ing;
      }).join(', ') + (ingredients.length > 3 ? `, +${ingredients.length - 3} more` : '');
    }
    return typeof ingredients === 'string' ? ingredients : '';
  };

  // Format instructions for preview
  const formatInstructions = (instructions) => {
    if (Array.isArray(instructions)) {
      const firstInstruction = instructions[0];
      const text = typeof firstInstruction === 'string' ? firstInstruction :
                   firstInstruction?.instruction || firstInstruction?.step || firstInstruction;
      return text ? text.substring(0, 60) + (text.length > 60 ? '...' : '') : '';
    }
    return typeof instructions === 'string' ? instructions.substring(0, 60) + '...' : '';
  };

  return (
    <div style={{
      border: '1px solid #fed7aa',
      borderRadius: '8px',
      padding: '12px',
      backgroundColor: '#fff7ed'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* Left side - Recipe info */}
        <div style={{ flex: 1 }}>
          {/* Recipe title - NO ICON */}
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px',
            margin: 0
          }}>
            {title}
          </h3>

          {/* Ingredients */}
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '8px'
          }}>
            <span style={{ fontWeight: '500', color: '#4b5563' }}>Ingredients:</span> {formatIngredients(ingredients)}
          </div>

          {/* Instructions preview */}
          {instructions.length > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              <span style={{ fontWeight: '500', color: '#4b5563' }}>Instructions:</span> {formatInstructions(instructions)}
            </div>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '4px',
          marginLeft: '12px'
        }}>
          <button style={{
            width: '32px',
            height: '32px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M3 3h18v18H3zM12 8v8m-4-4h8"/>
            </svg>
          </button>

          <button style={{
            width: '32px',
            height: '32px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button style={{
            width: '32px',
            height: '32px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </button>

          <button style={{
            width: '32px',
            height: '32px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipesFound;