import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import axios from "axios";
import { getToken, clearToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";

import HomeScreen from "./HomeScreen";
import ProductDetail from "./ProductDetail";
import AddProduct from "./AddProduct";
import CartScreen from "./CartScreen";
import MyProfile from "./MyProfile";
import LoginScreen from "./LoginScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dkerhtvlk/image/upload/v1753410801/fotoDefault_uegm43.jpg";

async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload64 = token.split(".")[1];
    // Decodificar base64 manualmente para React Native
    const decodedData = payload64.replace(/-/g, '+').replace(/_/g, '/');
    const decodedString = decodeURIComponent(
      atob(decodedData)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const jsonPayload = JSON.parse(decodedString);
    return jsonPayload.user_id || jsonPayload.sub || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      <Stack.Screen name="AddProduct" component={AddProduct} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="MyProfile" component={MyProfile} />
    </Stack.Navigator>
  );
}

function CustomDrawerContent(props) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;

      const userId = await getUserFromToken(token);
      if (!userId) return;

      try {
        const res = await axios.get(`http://${BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        setProfile(res.data);
      } catch (e) {
        console.warn("Error cargando perfil Drawer:", e);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await clearToken();
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente.");
    props.navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity
        onPress={() => props.navigation.navigate("Mi perfil")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <Image
          source={{ uri: profile?.profile_picture || DEFAULT_AVATAR }}
          style={{ width: 54, height: 54, borderRadius: 27, marginRight: 12 }}
        />
        <View>
          <Text style={{ fontWeight: "700", color: "#2E7D32" }}>
            {profile?.username || "Invitado"}
          </Text>
          <Text style={{ color: "#666", fontSize: 12 }}>{profile?.email || ""}</Text>
        </View>
      </TouchableOpacity>

      <DrawerItemList {...props} />

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: "#E53935",
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

export default function MainStack() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Home" component={HomeStack} />
      <Drawer.Screen name="Mi perfil" component={MyProfile} />
      <Drawer.Screen name="Carrito" component={CartScreen} />
    </Drawer.Navigator>
  );
}
