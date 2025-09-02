module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-useless-escape': 'warn',
    'react-hooks/exhaustive-deps': 'warn'
  }
};