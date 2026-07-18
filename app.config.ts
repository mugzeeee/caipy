import type { ExpoConfig, ConfigContext } from "@expo/config";

// Bundle id must be unique & reverse-DNS. Used for EAS signing.
const BUNDLE_ID = "com.caipy.localchat";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Caipy",
  slug: "caipy",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "caipy",
  userInterfaceStyle: "dark",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0e0f13",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    // App Transport Security: allow cleartext HTTP so we can hit
    // http://<lan-ip>:1234 (LM Studio on the local network).
    // NSAllowsLocalNetworking permits .local + LAN hosts; the arbitrary-load
    // bit covers raw IPs that iOS sometimes still flags. Safe for a LAN client.
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsLocalNetworking: true,
      },
      UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
      },
      UILaunchStoryboardName: "SplashScreen",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0e0f13",
    },
    package: BUNDLE_ID,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "", // filled in by `eas init` after you log in
    },
  },
});
