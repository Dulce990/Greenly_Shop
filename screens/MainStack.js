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

import {
  HomeScreen,
  ProductDetail,
  AddProduct,
  CartScreen,
  MyProfile,
  ProductsScreen,
  RecomendacionesScreen,
  AboutUs,
  MyProducts,
} from "./screen";

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
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="Recomendaciones" component={RecomendacionesScreen} />
      <Stack.Screen name="AboutUs" component={AboutUs} />
      <Stack.Screen name="MyProducts" component={MyProducts} />

    </Stack.Navigator>
  );
}

function CustomDrawerContent(props) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const userId = await getUserFromToken(token);
        if (!userId) return;
        const res = await axios.get(`http://${BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        if (!mounted) return;
        // add a cache-busting param to force reload when profile changes
        const pic = res.data?.profile_picture ? `${res.data.profile_picture}?t=${Date.now()}` : null;
        setProfile({ ...res.data, profile_picture: pic });
      } catch (e) {
        console.warn("Error cargando perfil Drawer:", e);
      }
    };

    // fetch once on mount
    fetchProfile();

    // refetch when drawer gains focus so updated profile (e.g. new avatar) is shown
    const unsubscribe = props.navigation.addListener('focus', fetchProfile);
    return () => {
      mounted = false;
      unsubscribe && unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await clearToken();
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente.");
    // Reset the root navigator to the Auth stack so user returns to Login.
    const parent = props.navigation.getParent();
    if (parent && parent.reset) {
      parent.reset({ index: 0, routes: [{ name: "Auth" }] });
    } else {
      // fallback: try to reset the current navigator (older react-navigation versions)
      props.navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    }
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
      <Drawer.Screen name="Recomendaciones" component={RecomendacionesScreen} />
      <Drawer.Screen name="Carrito" component={CartScreen} />
      <Drawer.Screen name="Productos" component={ProductsScreen} />
      <Drawer.Screen name="Sobre nosotros" component={AboutUs} />
      <Drawer.Screen name="Mis productos" component={MyProducts} />
      <Drawer.Screen name="Agregar producto" component={AddProduct} />
    </Drawer.Navigator>
  );
}
