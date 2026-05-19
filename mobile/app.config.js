import "dotenv/config";

export default {
    expo: {
        name: "Ciro Emergency",
        slug: "Ciro_Emergency",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,

        splash: {
            image: "./assets/icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },

        ios: {
            supportsTablet: true
        },

        android: {
            package: "com.diverse.ciro",
            edgeToEdgeEnabled: true,
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            config: {
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY
                }
            }
        },

        web: {
            favicon: "./assets/favicon.png"
        },

        extra: {
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
        }
    }
};