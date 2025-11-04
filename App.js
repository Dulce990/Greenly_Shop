// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen"; // crea o adapta tu HomeScreen
import MainDrawerOrStack from "./screens/MainStack"; // opcional: tu stack/drawer principal

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown:false }}>
      <AuthStack.Screen name="Login" component={LoginScreen}/>
      <AuthStack.Screen name="Register" component={RegisterScreen}/>
    </AuthStack.Navigator>
  );
}

function MainStackScreen(){
  return (
    <MainStack.Navigator screenOptions={{ headerShown:false }}>
      {/* puedes poner aquí tu Drawer/Stack con Home, Products, etc */}
      <MainStack.Screen name="Main" component={HomeScreen} />
    </MainStack.Navigator>
  );
}

export default function App(){
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown:false }}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Auth" component={AuthStackScreen} />
        <RootStack.Screen name="Main" component={MainStackScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
