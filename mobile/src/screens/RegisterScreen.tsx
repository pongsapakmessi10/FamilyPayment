import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../lib/api';
import FamilyLogo from '../../assets/FamilyPaymentLogo.png'
import { Eye, EyeOff, Lock, User, Mail, Users, Key } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../lib/theme';

export default function RegisterScreen({ navigation }: any) {
    const [isCreatingFamily, setIsCreatingFamily] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username || !email || !password) {
            Alert.alert('Error', 'Please fill in all common fields');
            return;
        }

        if (isCreatingFamily && !familyName) {
            Alert.alert('Error', 'Please enter a family name');
            return;
        }

        if (!isCreatingFamily && !inviteCode) {
            Alert.alert('Error', 'Please enter an invite code');
            return;
        }

        setLoading(true);
        try {
            const endpoint = isCreatingFamily ? '/auth/register-owner' : '/auth/register-member';
            const payload = isCreatingFamily
                ? { username, email, password, familyName }
                : { username, email, password, inviteCode };

            await api.post(endpoint, payload);
            Alert.alert('Success', 'Registration successful! Please login.');
            navigation.navigate('Login');
        } catch (err: any) {
            console.error(err);
            const message = err.response?.data?.message || 'Registration failed';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Image source={FamilyLogo} style={styles.logo} resizeMode="contain" />
                    </View>

                    {/* Card Container */}
                    <View style={styles.card}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>
                                {isCreatingFamily ? 'Start your family journey' : 'Join an existing family'}
                            </Text>
                        </View>

                        {/* Toggle Tabs */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleButton, isCreatingFamily && styles.toggleButtonActive]}
                                onPress={() => setIsCreatingFamily(true)}
                                activeOpacity={0.7}
                            >
                                <Users color={isCreatingFamily ? COLORS.primary : COLORS.textSecondary} size={18} />
                                <Text style={[styles.toggleText, isCreatingFamily && styles.toggleTextActive]}>
                                    Create Family
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleButton, !isCreatingFamily && styles.toggleButtonActive]}
                                onPress={() => setIsCreatingFamily(false)}
                                activeOpacity={0.7}
                            >
                                <Key color={!isCreatingFamily ? COLORS.primary : COLORS.textSecondary} size={18} />
                                <Text style={[styles.toggleText, !isCreatingFamily && styles.toggleTextActive]}>
                                    Join Family
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Input Fields */}
                        <View style={styles.formContainer}>
                            {/* Username */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Username</Text>
                                <View style={styles.inputContainer}>
                                    <User color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your username"
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <View style={styles.inputContainer}>
                                    <Mail color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="you@example.com"
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>

                            {/* Family Name OR Invite Code */}
                            {isCreatingFamily ? (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Family Name</Text>
                                    <View style={styles.inputContainer}>
                                        <Users color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="The Smiths"
                                            placeholderTextColor={COLORS.textSecondary}
                                            value={familyName}
                                            onChangeText={setFamilyName}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Invite Code</Text>
                                    <View style={styles.inputContainer}>
                                        <Key color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="XXXXXXXX"
                                            placeholderTextColor={COLORS.textSecondary}
                                            value={inviteCode}
                                            onChangeText={setInviteCode}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.inputContainer}>
                                    <Lock color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                        activeOpacity={0.7}
                                    >
                                        {showPassword ?
                                            <EyeOff color={COLORS.textSecondary} size={20} /> :
                                            <Eye color={COLORS.textSecondary} size={20} />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.buttonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Login')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.signInText}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 20,
        paddingBottom: 150,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    logo: {
        width: 180,
        height: 60,
        tintColor: COLORS.primary,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        // Removed padding to make it cleaner on mobile, or keep minimal
        padding: 8,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        gap: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        gap: 6,
    },
    toggleButtonActive: {
        backgroundColor: COLORS.surface,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    toggleTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    formContainer: {
        marginBottom: 8,
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        paddingVertical: 0,
    },
    eyeIcon: {
        padding: 8,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    signInText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginLeft: 4,
    },
});