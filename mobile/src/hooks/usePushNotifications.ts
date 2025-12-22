import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Fix handler type
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true, // required by type
            shouldShowList: true,   // required by type
        }),
    });
} catch (error) {
    console.log('Error setting notification handler:', error);
}

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(); // Restore missing line
    const [notificationResponse, setNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    const registerForPushNotificationsAsync = async () => {
        let token;
        // ... (rest of function is same) ...
        // Re-declaring for clarity in diff, but using ellipsis for brevity in actual file update if possible?
        // No, replace_file_content needs exact match. 
        // I will just replace the top variable declaration block to be safe.

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }

            try {
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId,
                })).data;
            } catch (e) {
                console.error("Error getting token", e);
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        setExpoPushToken(token);
        return token;
    };

    useEffect(() => {
        // Cold Start: Check if app was opened by a notification
        const checkInitialNotification = async () => {
            const response = await Notifications.getLastNotificationResponseAsync();
            if (response) {
                console.log("🔔 [Hook] Found initial notification:", response);
                setNotificationResponse(response);
            }
        };
        checkInitialNotification();

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("🔔 [Hook] Received response listener:", response);
            setNotificationResponse(response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
        notificationResponse,
        registerForPushNotificationsAsync
    };
};
