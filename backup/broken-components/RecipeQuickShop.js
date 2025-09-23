// client/src/components/RecipeQuickShop.js
function RecipeQuickShop({ recipe }) {
  const [stage, setStage] = useState('preview'); // preview -> customize -> shop
  const [adjustedRecipe, setAdjustedRecipe] = useState(recipe);
  
  return (
    <div style={styles.quickShop}>
      <div style={styles.progressBar}>
        <div style={{...styles.step, ...(stage === 'preview' ? styles.stepActive : {})}}>
          1. Preview
        </div>
        <div style={{...styles.step, ...(stage === 'customize' ? styles.stepActive : {})}}>
          2. Customize
        </div>
        <div style={{...styles.step, ...(stage === 'shop' ? styles.stepActive : {})}}>
          3. Shop
        </div>
      </div>
      
      {stage === 'preview' && (
        <RecipePreview 
          recipe={recipe}
          onContinue={() => setStage('customize')}
        />
      )}
      
      {stage === 'customize' && (
        <RecipeCustomizer
          recipe={recipe}
          onCustomize={(customized) => {
            setAdjustedRecipe(customized);
            setStage('shop');
          }}
        />
      )}
      
      {stage === 'shop' && (
        <ShoppingOrchestrator
          items={adjustedRecipe.shoppingItems}
          recipe={adjustedRecipe}
        />
      )}
    </div>
  );
}