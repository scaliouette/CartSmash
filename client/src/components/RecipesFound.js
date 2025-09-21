import React from 'react';

const RecipesFound = ({
  recipes,
  onClearAll,
  onCollapseExpand,
  expanded,
  individualExpansionStates,
  onToggleIndividualExpansion,
  onAddToCart,
  onAddToLibrary,
  onAddToMealPlan,
  onRemove
}) => {
  if (!recipes || recipes.length === 0) {
    return null;
  }

  // Auto-expand all recipes when main section is first expanded for better UX
  React.useEffect(() => {
    if (expanded && onToggleIndividualExpansion) {
      // Check if any recipes are collapsed, if so expand them all
      const hasCollapsedRecipes = recipes.some((_, index) => !individualExpansionStates?.[index]);
      if (hasCollapsedRecipes) {
        console.log('🎛️ Auto-expanding all recipe details for better UX');
        // Expand all recipes when main section is expanded
        recipes.forEach((_, index) => {
          if (!individualExpansionStates?.[index]) {
            setTimeout(() => onToggleIndividualExpansion(index), index * 50); // Stagger for visual effect
          }
        });
      }
    }
  }, [expanded, individualExpansionStates, onToggleIndividualExpansion, recipes]);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e5e5',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      position: 'relative'
    }}>
      {/* Header - Clickable */}
      <div
        onClick={onCollapseExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: expanded ? '16px' : '0',
          gap: '12px',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '6px',
          transition: 'background-color 0.2s',
          ':hover': {
            backgroundColor: '#f9fafb'
          }
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <div style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280'
        }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        <div style={{
          width: '36px',
          height: '36px',
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg
            width="16"
            height="18"
            viewBox="0 0 14 18"
            fill="white"
          >
            <path d="M0 0v18l14-9z" />
          </svg>
        </div>

        <span style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#111827'
        }}>
          Recipes Found
        </span>
        <span style={{
          fontSize: '14px',
          color: '#6b7280'
        }}>
          ({recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'})
        </span>
        {!expanded && (
          <span style={{
            fontSize: '12px',
            color: '#059669',
            fontWeight: '500',
            marginLeft: '8px'
          }}>
            Click to view details →
          </span>
        )}
      </div>

      {/* Clear button - outside clickable area */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClearAll();
        }}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '32px',
          height: '32px',
          border: '1px solid #e5e5e5',
          borderRadius: '6px',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          zIndex: 2
        }}
        title="Clear all recipes"
      >
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

      {/* Recipe Cards */}
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recipes.map((recipe, index) => (
            <RecipeCard
              key={index}
              recipe={recipe}
              isExpanded={individualExpansionStates?.[index] || false}
              onToggleExpansion={() => onToggleIndividualExpansion && onToggleIndividualExpansion(index)}
              onAddToCart={() => onAddToCart && onAddToCart(recipe)}
              onAddToLibrary={() => onAddToLibrary && onAddToLibrary(recipe)}
              onAddToMealPlan={() => onAddToMealPlan && onAddToMealPlan(recipe)}
              onRemove={() => onRemove && onRemove(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RecipeCard = ({
  recipe,
  isExpanded,
  onToggleExpansion,
  onAddToCart,
  onAddToLibrary,
  onAddToMealPlan,
  onRemove
}) => {
  return (
    <div style={{
      border: '2px solid #ff8c66',
      borderRadius: '12px',
      backgroundColor: '#fff9f7',
      overflow: 'hidden'
    }}>
      {/* Recipe Header */}
      <div
        onClick={onToggleExpansion}
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff5f2',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#fff5f2'}
        title="Click to view recipe details"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1
        }}>
          {/* Expand indicator */}
          <div style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280'
          }}>
            <svg
              width="14"
              height="14"
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
          </div>

          {/* Play button */}
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#2563eb',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg
              width="12"
              height="14"
              viewBox="0 0 12 14"
              fill="white"
            >
              <path d="M0 0v14l12-7z" />
            </svg>
          </div>

          {/* Recipe name */}
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            {recipe.name || recipe.title || 'Untitled Recipe'}
          </h3>
        </div>

        {/* Action buttons grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            style={{
              width: '30px',
              height: '30px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Add to Cart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M3 3h18v18H3zM12 8v8m-4-4h8"/>
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToLibrary();
            }}
            style={{
              width: '30px',
              height: '30px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Add to Library"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToMealPlan();
            }}
            style={{
              width: '30px',
              height: '30px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Save Recipe"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              width: '30px',
              height: '30px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Remove Recipe"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #fed7aa'
        }}>
          {/* Ingredients */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Ingredients:
            </h4>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: '1.5',
              margin: 0
            }}>
              {Array.isArray(recipe.ingredients)
                ? recipe.ingredients.map((ingredient, idx) => {
                    if (typeof ingredient === 'string') return ingredient;
                    if (typeof ingredient === 'object' && ingredient !== null) {
                      return `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name || ''}`.trim();
                    }
                    return '';
                  }).join(', ')
                : typeof recipe.ingredients === 'string'
                  ? recipe.ingredients
                  : 'No ingredients available'
              }
            </p>
          </div>

          {/* Instructions */}
          <div>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Instructions:
            </h4>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: '1.5',
              margin: 0
            }}>
              {Array.isArray(recipe.instructions)
                ? recipe.instructions.map((instruction, idx) => {
                    if (typeof instruction === 'string') return instruction;
                    if (typeof instruction === 'object' && instruction !== null) {
                      return instruction.text || instruction.step || String(instruction);
                    }
                    return '';
                  }).join('. ')
                : typeof recipe.instructions === 'string'
                  ? recipe.instructions
                  : 'No instructions available'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipesFound;