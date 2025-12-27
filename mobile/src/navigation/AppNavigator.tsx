import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { View, ActivityIndicator } from 'react-native';

import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import DebtsScreen from '../screens/DebtsScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import BillsScreen from '../screens/BillsScreen';
import DreamsScreen from '../screens/DreamsScreen';
import EventsScreen from '../screens/EventsScreen';
import ChatScreen from '../screens/ChatScreen';
import MembersScreen from '../screens/MembersScreen';
import AllExpensesScreen from '../screens/AllExpensesScreen';
import AboutUs from '../screens/AboutUs';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
                <>
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ headerShown: true, title: 'Transactions' }} />
                    <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ presentation: 'modal' }} />
                    <Stack.Screen name="Debts" component={DebtsScreen} options={{ headerShown: true, title: 'My Debts' }} />
                    <Stack.Screen name="Shopping" component={ShoppingScreen} options={{ headerShown: true, title: 'Shopping List' }} />
                    <Stack.Screen name="Bills" component={BillsScreen} options={{ headerShown: true, title: 'Bills' }} />
                    <Stack.Screen name="Dreams" component={DreamsScreen} options={{ headerShown: true, title: 'Savings Goals' }} />
                    <Stack.Screen name="Events" component={EventsScreen} options={{ headerShown: true, title: 'Calendar' }} />
                    <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Members" component={MembersScreen} options={{ headerShown: true, title: 'Members' }} />
                    <Stack.Screen name="AllExpenses" component={AllExpensesScreen} options={{ headerShown: true, title: 'All Expenses' }} />
                    <Stack.Screen name="AboutUs" component={AboutUs} options={{ headerShown: true, title: 'About Us' }} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}
