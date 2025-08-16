// client/src/components/SmartSubstitutions.js
function SmartSubstitutions({ items, vendor, onSubstitute }) {
  const [substitutions, setSubstitutions] = useState({});
  
  useEffect(() => {
    findSubstitutions();
  }, [items, vendor]);
  
  const findSubstitutions = async () => {
    const response = await fetch('/api/shopping/find-substitutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, vendor })
    });
    
    const data = await response.json();
    setSubstitutions(data.substitutions);
  };
  
  const outOfStockItems = items.filter(item => 
    substitutions[item.id]?.reason === 'out-of-stock'
  );
  
  const savingsOpportunities = items.filter(item => 
    substitutions[item.id]?.reason === 'better-price'
  );
  
  if (outOfStockItems.length === 0 && savingsOpportunities.length === 0) {
    return null;
  }
  
  return (
    <div style={styles.substitutionsContainer}>
      {outOfStockItems.length > 0 && (
        <div style={styles.outOfStock}>
          <h4>⚠️ Out of Stock Items - Suggested Alternatives:</h4>
          {outOfStockItems.map(item => {
            const sub = substitutions[item.id];
            return (
              <div key={item.id} style={styles.substitutionRow}>
                <span style={styles.originalItem}>
                  ❌ {item.productName}
                </span>
                <span style={styles.arrow}>→</span>
                <span style={styles.substituteItem}>
                  ✅ {sub.substitute.name} (${sub.substitute.price})
                </span>
                <button
                  onClick={() => onSubstitute(item, sub.substitute)}
                  style={styles.acceptButton}
                >
                  Accept
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      {savingsOpportunities.length > 0 && (
        <div style={styles.savings}>
          <h4>💰 Save Money with These Alternatives:</h4>
          {savingsOpportunities.map(item => {
            const sub = substitutions[item.id];
            return (
              <div key={item.id} style={styles.substitutionRow}>
                <span style={styles.originalItem}>
                  {item.productName} (${item.price})
                </span>
                <span style={styles.arrow}>→</span>
                <span style={styles.substituteItem}>
                  {sub.substitute.name} (${sub.substitute.price})
                  <span style={styles.savingsBadge}>
                    Save ${(item.price - sub.substitute.price).toFixed(2)}
                  </span>
                </span>
                <button
                  onClick={() => onSubstitute(item, sub.substitute)}
                  style={styles.acceptButton}
                >
                  Switch
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}