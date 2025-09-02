# Store Configuration Documentation

This directory contains configuration files for CARTSMASH store integrations.

## Files

### `storeConfig.js`
Contains all supported store chains and their integration details for the client-side "Stores" section.

## Store Configuration Structure

Each store in `STORE_CHAINS` has the following structure:

```javascript
STORE_NAME: {
  id: 'unique-store-id',
  name: 'Display Name',
  displayName: 'Full Display Name',
  parent: 'Parent Company',
  type: 'grocery',
  status: 'active|planned|testing|maintenance',
  features: {
    digitalOrdering: boolean,
    curbsidePickup: boolean,
    delivery: boolean,
    mobileApp: boolean,
    loyaltyProgram: boolean,
    // Additional features...
  },
  integration: {
    apiAvailable: boolean,
    authMethod: 'oauth|api-key|custom',
    capabilities: ['cart', 'products', 'stores', 'pricing'],
    sharedSystem: 'parent-store-id' // If shares API with another store
  },
  branding: {
    primaryColor: '#hexcode',
    logo: '/path/to/logo.png',
    icon: '🛒'
  },
  regions: ['State1', 'State2', ...]
}
```

## Usage Examples

### Import the configuration:
```javascript
import { 
  STORE_CHAINS, 
  STORE_GROUPS,
  getStoreById,
  getStoresByRegion,
  getActiveStores
} from '../config/storeConfig';
```

### Get all active stores:
```javascript
const activeStores = getActiveStores();
```

### Get stores by region:
```javascript
const californiaStores = getStoresByRegion('California');
```

### Get specific store:
```javascript
const kroger = getStoreById('kroger');
```

### Get stores with specific feature:
```javascript
import { getStoresWithFeature } from '../config/storeConfig';
const deliveryStores = getStoresWithFeature('delivery');
```

## Store Groups

Stores are organized into families that share integration systems:

- **Kroger Family**: All Kroger-owned stores share the same API
- **Safeway Family**: Albertsons-owned stores
- **Raley's Family**: All Raley's branded stores
- **Sprouts Family**: Sprouts and Sprouts Express
- **Independent**: Standalone stores

## Implementation Notes

### When implementing the Stores section:

1. **Store Grid Display**: Use `STORE_CHAINS` to populate store listings
2. **Filtering**: Use helper functions to filter by region, status, or features
3. **Branding**: Each store has its own color scheme and branding assets
4. **Integration**: Check `integration.sharedSystem` for stores that share APIs
5. **Status Display**: Use `STORE_STATUS` for consistent status styling

### Example Store Component:
```jsx
import { STORE_CHAINS, STORE_STATUS } from '../config/storeConfig';

const StoreCard = ({ storeId }) => {
  const store = STORE_CHAINS[storeId];
  const status = STORE_STATUS[store.status];
  
  return (
    <div className="store-card">
      <div className="store-header" style={{ backgroundColor: store.branding.primaryColor }}>
        <span className="store-icon">{store.branding.icon}</span>
        <h3>{store.displayName}</h3>
      </div>
      <div className="store-status" style={{ color: status.color }}>
        {status.label}
      </div>
      <div className="store-features">
        {store.features.delivery && <span>🚚 Delivery</span>}
        {store.features.curbsidePickup && <span>🚗 Pickup</span>}
        {store.features.loyaltyProgram && <span>⭐ Rewards</span>}
      </div>
    </div>
  );
};
```

## Future Expansion

To add new stores:

1. Add store configuration to `STORE_CHAINS`
2. Update `STORE_GROUPS` if creating a new family
3. Add logo assets to `/public/assets/logos/`
4. Update regional coverage as needed

## Current Store Status

- **Active (1)**: Kroger (fully integrated)
- **Planned (13)**: All other stores in configuration
- **Total Coverage**: 20+ states across major US regions

## Integration Priority

Based on market presence and API availability:
1. Kroger Family (already active)
2. Safeway/Albertsons Family
3. Sprouts Farmers Market
4. Raley's Family
5. Smart & Final