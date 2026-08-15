// Sentry's Metro wrapper. getSentryExpoConfig() is Expo's default Metro
// config plus the source-map handling Sentry needs to symbolicate minified
// production stack traces -- without it, every crash report shows unreadable
// bundle offsets instead of real file names and line numbers.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
