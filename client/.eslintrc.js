module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-useless-escape': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // ✅ PREVENT localStorage recipe usage - will cause build to FAIL if violated
    'no-restricted-syntax': [
      'error',
      {
        'selector': 'CallExpression[callee.object.name="localStorage"][callee.property.name=/getItem|setItem|removeItem/] > Literal[value=/recipe/i]',
        'message': 'localStorage usage for recipes is FORBIDDEN. Use Firestore for authenticated users, session state for unauthenticated users.'
      },
      {
        'selector': 'CallExpression[callee.object.name="localStorage"][callee.property.name=/getItem|setItem|removeItem/][arguments.0.value=/recipe/i]',
        'message': 'localStorage usage for recipes is FORBIDDEN. Use Firestore for authenticated users, session state for unauthenticated users.'
      }
    ]
  }
};