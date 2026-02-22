// Expo loads .env when you run `expo start`; EXPO_PUBLIC_* are then in process.env.
// We pass apiBaseUrl into extra so the app can read it via Constants.expoConfig.extra.
const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo?.plugins || []),
      "expo-video",
      [
        "expo-av",
        {
          microphonePermission:
            "Allow Desynar to record voice instructions for your order.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Desynar to access your photos for measurement profile photos.",
          cameraPermission: "Allow Desynar to use your camera to take measurement photos.",
        },
      ],
    ],
    extra: {
      ...(appJson.expo?.extra || {}),
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000",
    },
  },
};
