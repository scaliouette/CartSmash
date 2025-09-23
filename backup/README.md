# CartSmash Backup Directory

This directory contains archived files that are no longer actively used in the CartSmash production application but are preserved for historical reference and potential future restoration.

## 📂 Directory Structure

### `/legacy-components/`
**Purpose**: Superseded React components that have been replaced by newer implementations
**Contents**:
- Old Instacart checkout components (InstacartCheckout.js, InstacartCheckoutEnhanced.js, etc.)
- Deprecated UI components that have been consolidated or redesigned

**Restore Conditions**: If unified components need to be rolled back or split into specialized versions

### `/broken-components/`
**Purpose**: Components with errors, missing imports, or functionality issues
**Contents**:
- RecipeQuickShop.js (has missing React imports and undefined styles)
- SmartSubstitutions.js (has missing React imports and undefined styles)

**Restore Conditions**: After fixing import errors and implementing missing functionality

### `/duplicates/`
**Purpose**: Duplicate files that exist in multiple locations
**Contents**:
- client/src/DebugInfo.js (duplicate of components/DebugInfo)
- client/src/ErrorBoundary.js (duplicate of components/ErrorBoundary.js)

**Restore Conditions**: If the primary file is accidentally deleted

### `/legacy-config/`
**Purpose**: Old configuration files replaced by newer implementations
**Contents**:
- client/src/firebase.js (replaced by firebase/config.js)

**Restore Conditions**: If new configuration fails and rollback is needed

### `/legacy-scripts/`
**Purpose**: Old development and maintenance scripts no longer needed
**Contents**:
- complete-fix.js (old development fix script)
- complete-fix-with-components.js
- fix-project.js

**Restore Conditions**: If similar functionality is needed for new development issues

### `/migration-scripts/`
**Purpose**: One-time migration scripts that have completed their purpose
**Contents**:
- rebrand-to-cartsmash.js (completed rebranding from HulkCart)

**Restore Conditions**: If rebranding needs to be reversed or applied to new files

### `/setup-scripts/`
**Purpose**: Old setup and initialization scripts
**Contents**:
- setup.js
- setup-cart-merge-replace.js

**Restore Conditions**: If new setup process fails and manual setup is needed

### `/kroger-integration/`
**Purpose**: Complete Kroger integration implementation (inactive)
**Contents**:
- All Kroger-related components, services, and API integrations
- Authentication, order flow, and API service implementations

**Restore Conditions**: If Kroger integration is reactivated in the future

## 🔄 Restoration Process

### To Restore a Single File:
1. Copy the file from the appropriate backup subdirectory
2. Place it back in its original location in the source tree
3. Update any import statements that may have changed
4. Test functionality to ensure compatibility with current codebase

### To Restore an Entire Feature:
1. Review the backup directory contents
2. Copy all related files back to their original locations
3. Update package.json dependencies if needed
4. Update routing and component imports
5. Run full test suite to ensure integration

## ⚠️ Important Notes

- **Do Not Modify**: Files in backup directories should not be modified. If changes are needed, restore to main codebase first.
- **Version Compatibility**: Backed up files may not be compatible with current dependency versions.
- **Documentation**: Check CLAUDE.md for the latest documentation before restoring any components.
- **Testing Required**: All restored files must be thoroughly tested before deployment.

## 📊 Backup Statistics

- **Total Files Backed Up**: 25+
- **Space Saved in Main Codebase**: ~23% reduction in maintenance burden
- **Categories**: 8 distinct backup categories
- **Largest Category**: Kroger integration (10+ files)

---

*Backup Created: 2025-09-23*
*Last Updated: 2025-09-23*
*Backup Strategy: Documented in CLAUDE.md*