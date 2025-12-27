import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Instagram, Facebook, Github, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../lib/theme';

const AboutUs = ({ navigation }: any) => {
    const openURL = (url: string) => {
        Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
               
            </View>

            {/* Main Content */}
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header Section */}
                <View style={styles.profileSection}>
                    {/* Avatar with Gradient Border */}
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['#cf7317', '#eebc88']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientBorder}
                        />
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{ uri: 'https://fw-fileupload-th.s3.ap-southeast-1.amazonaws.com/users/accf8af1-513d-4130-aeaa-fadea9d30e0f/profile/3cec31b8-7bf8-49fa-b71a-385403c78dc8.jpg' }}
                                style={styles.avatar}
                                resizeMode="cover"
                            />
                        </View>
                    </View>

                    {/* Developer Info */}
                    <View style={styles.developerInfo}>
                        <Text style={styles.developedBy}>DEVELOPED BY</Text>
                        <Text style={styles.developerName}>Pongsapak Jongsomsuk</Text>
                        <Text style={styles.tagline}>ดูเเลการเงินในครอบครัว</Text>
                    </View>
                </View>

                {/* Social Links */}
                <View style={styles.socialSection}>
                    {/* Instagram */}
                    <TouchableOpacity
                        style={styles.socialCard}
                        onPress={() => openURL('https://www.instagram.com/flukie_mee/')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.socialContent}>
                            <View style={styles.iconContainer}>
                                <Instagram size={24} color={COLORS.text} />
                            </View>
                            <View style={styles.socialText}>
                                <Text style={styles.socialTitle}>Instagram</Text>
                                <Text style={styles.socialHandle}>@flukie_mee</Text>
                            </View>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>

                    {/* Facebook */}
                    <TouchableOpacity
                        style={styles.socialCard}
                        onPress={() => openURL('https://facebook.com/pongsapak.jongsomsuknew')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.socialContent}>
                            <View style={styles.iconContainer}>
                                <Facebook size={24} color={COLORS.text} />
                            </View>
                            <View style={styles.socialText}>
                                <Text style={styles.socialTitle}>Facebook</Text>
                                <Text style={styles.socialHandle}>/pongsapak.jongsomsuknew</Text>
                            </View>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>

                    {/* Github */}
                    <TouchableOpacity
                        style={styles.socialCard}
                        onPress={() => openURL('https://github.com/pongsapakmessi10')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.socialContent}>
                            <View style={styles.iconContainer}>
                                <Github size={24} color={COLORS.text} />
                            </View>
                            <View style={styles.socialText}>
                                <Text style={styles.socialTitle}>Github</Text>
                                <Text style={styles.socialHandle}>@pongsapakmessi10</Text>
                            </View>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.version}>FamilyPayment App v1.0.2</Text>
                   
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f7f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f7f6',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1b140e',
        letterSpacing: -0.3,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 48,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    avatarContainer: {
        width: 128,
        height: 128,
        marginBottom: 24,
        position: 'relative',
    },
    gradientBorder: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 68,
        opacity: 0.7,
    },
    avatarWrapper: {
        width: 128,
        height: 128,
        borderRadius: 64,
        overflow: 'hidden',
        backgroundColor: '#e5e5e5',
        borderWidth: 4,
        borderColor: '#ffffff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    developerInfo: {
        alignItems: 'center',
        gap: 4,
    },
    developedBy: {
        fontSize: 12,
        fontWeight: '600',
        color: '#cf7317',
        letterSpacing: 2,
        marginBottom: 4,
    },
    developerName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1b140e',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6b7280',
        marginTop: 4,
    },
    socialSection: {
        gap: 16,
        marginBottom: 32,
    },
    socialCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    socialContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f3ede7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialText: {
        gap: 4,
    },
    socialTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1b140e',
    },
    socialHandle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9ca3af',
    },
    chevron: {
        fontSize: 24,
        color: '#d1d5db',
        fontWeight: '300',
    },
    footer: {
        alignItems: 'center',
        marginTop: 64,
        gap: 8,
    },
    version: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
        letterSpacing: 0.5,
    },
    builtWith: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    builtWithText: {
        fontSize: 12,
        color: '#9ca3af',
    },
});

export default AboutUs;