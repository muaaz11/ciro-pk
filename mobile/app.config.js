import "dotenv/config";

export default ({ config }) => {
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || config.android?.config?.googleMaps?.apiKey || "";

    return {
        ...config,
        name: "Ciro Emergency",
        slug: "Ciro_Emergency",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "dark",
        newArchEnabled: true,

        splash: {
            image: "./assets/icon.png",
            resizeMode: "contain",
            backgroundColor: "#0A0A0A"
        },

        ios: {
            supportsTablet: true,
            config: {
                googleMapsApiKey: mapsKey
            }
        },

        android: {
            ...config.android,
            package: "com.diverse.ciro",
            edgeToEdgeEnabled: true,
            adaptiveIcon: {
                foregroundImage: "./assets/icon.png",
                backgroundColor: "#0A0A0A"
            },
            config: {
                googleMaps: {
                    apiKey: mapsKey
                }
            }
        },

        web: {
            favicon: "./assets/icon.png"
        },

        extra: {
            googleMapsApiKey: mapsKey,
            eas: {
                projectId: "002c918f-014e-474e-8a50-902a4fe37e0a"
            }
        },

        plugins: [
            "expo-font",
            [
                "expo-speech-recognition",
                {
                    "microphonePermission": "CIRO needs microphone access to record emergency voice reports.",
                    "speechRecognitionPermission": "CIRO needs speech recognition to transcribe your emergency report."
                }
            ]
        ]
    }
}