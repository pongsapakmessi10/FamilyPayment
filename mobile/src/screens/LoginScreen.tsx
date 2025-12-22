import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import FamilyLogo from '../../assets/FamilyPaymentLogo.png'
import { Eye, EyeOff, Lock, CheckSquare, Square, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../lib/theme';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email: email.trim(), password });
            await login(res.data.token, res.data.user);
        } catch (err: any) {
            console.error(err);
            // Ignore backend message, show friendly message as requested
            Alert.alert('Login Failed', 'Username or Password not correct');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* 1. Image Center */}
                <View style={styles.logoContainer}>
                    <Image source={FamilyLogo} style={styles.logo} resizeMode="contain" />
                </View>

                {/* 2. Login Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to manage your family finance.</Text>
                </View>

                {/* 3. Username */}
                <View style={styles.inputGroup}>

                    <View style={styles.inputContainer}>
                        <Mail color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username / Email"
                            placeholderTextColor={COLORS.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>
                </View>

                {/* 4. Password */}
                <View style={styles.inputGroup}>

                    <View style={styles.inputContainer}>
                        <Lock color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={COLORS.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />

                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            {showPassword ? <EyeOff color={COLORS.textSecondary} size={20} /> : <Eye color={COLORS.textSecondary} size={20} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 5. Remember Me */}
                <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
                    {rememberMe ? <CheckSquare color={COLORS.primary} size={20} /> : <Square color={COLORS.textSecondary} size={20} />}
                    <Text style={[styles.rememberText, rememberMe && styles.rememberTextActive]}>Remember me</Text>
                </TouchableOpacity>

                {/* 6. Sign In Header & Button */}
                <View style={styles.signInSection}>
                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color={COLORS.textInverse} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* 7. Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>New to Family Payment? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.signUpText}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: 32,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 180,
        height: 60,
        tintColor: COLORS.primary, // Optional: tint logo to match theme if it's monochromatic
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
    },
    eyeIcon: {
        padding: 8,
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    rememberText: {
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    rememberTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    signInSection: {
        marginTop: 8,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: COLORS.textInverse,
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    footerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    signUpText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginLeft: 4,
    },
});
