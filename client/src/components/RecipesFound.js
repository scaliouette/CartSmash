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
  const [hasAutoExpanded, setHasAutoExpanded] = React.useState(false);

  // Auto-expand all recipes when main section is first expanded for better UX
  React.useEffect(() => {
    if (expanded && onToggleIndividualExpansion && recipes && recipes.length > 0 && !hasAutoExpanded) {
      // Only auto-expand if ALL recipes are currently collapsed (first time expanding)
      // This prevents interference with manual collapse/expand actions
      const allRecipesCollapsed = recipes.every((_, index) => !individualExpansionStates?.[index]);
      if (allRecipesCollapsed) {
        console.log('🎛️ Auto-expanding all recipe details for first-time expansion');
        setHasAutoExpanded(true);
        // Expand all recipes when main section is expanded for the first time
        recipes.forEach((_, index) => {
          setTimeout(() => onToggleIndividualExpansion(index), index * 50); // Stagger for visual effect
        });
      }
    }
    // Reset flag when main section is collapsed
    if (!expanded) {
      setHasAutoExpanded(false);
    }
  }, [expanded, individualExpansionStates, onToggleIndividualExpansion, recipes, hasAutoExpanded]);

  if (!recipes || recipes.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '2px solid #FFD4C4',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 4px 12px rgba(251, 79, 20, 0.1)',
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
        onMouseEnter={(e) => e.target.style.backgroundColor = '#FFF5F0'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <div style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#002244'
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
          backgroundColor: '#FB4F14',
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
          color: '#002244'
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
            color: '#FB4F14',
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
      border: '2px solid #FFD4C4',
      borderRadius: '12px',
      backgroundColor: '#FFF5F0',
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
          backgroundColor: '#E6EBF2',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#FFF5F0'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#E6EBF2'}
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
            backgroundColor: '#FB4F14',
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
            color: '#002244',
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
            title="Add Ingredients to Shopping List"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
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
            title="Save to Recipe Library"
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
            title="Add to Meal Plan"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
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
          borderTop: '1px solid #FFD4C4'
        }}>
          {/* Ingredients */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#002244',
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
              color: '#002244',
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