/** Jest config — extends jest-expo preset (the RN testing standard). */
module.exports = {
  preset: 'jest-expo',
  // setupFiles runs before the test framework: register native-module mocks
  // before any test file imports the container (which pulls AsyncStorage in).
  setupFiles: ['<rootDir>/jest.mocks.ts'],
  // setupFilesAfterEnv runs after the framework is ready (beforeEach exists).
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-redux|@reduxjs/toolkit|@tanstack/react-query|zustand|immer|reselect|redux|use-sync-external-store)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
