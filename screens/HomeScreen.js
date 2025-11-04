// screens/HomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Button,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import { getToken, clearToken } from "../utils/TokenStore";

const BASE_URL = "YOUR_API_HOST_OR_IP:PORT"; // cambia por tu backend (ej: 192.168.x.x:8000)

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const token = await getToken();
    if (!token) {
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`http://${BASE_URL}/products/get`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data || []);
    } catch (e) {
      ToastAndroid.show("Error cargando productos", ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await clearToken();
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6BAA00" />
        <Text style={{ marginTop: 10 }}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenido a GreenShop 🌿</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("ProductDetail", { id: item.id })
            }
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.category}>
              {item.category} • ${item.price}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 30 }}>
            No hay productos disponibles
          </Text>
        }
      />

      <View style={styles.bottomButtons}>
        <Button
          title="Agregar producto"
          color="#5AA700"
          onPress={() => navigation.navigate("AddProduct")}
        />
        <View style={{ width: 10 }} />
        <Button
          title="Carrito"
          color="#7CB342"
          onPress={() => navigation.navigate("Cart")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#33691E" },
  logoutBtn: { backgroundColor: "#E8F5E9", padding: 6, borderRadius: 8 },
  logoutText: { color: "#1B5E20", fontSize: 12 },
  card: {
    backgroundColor: "#F1F8E9",
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  name: { fontWeight: "700", color: "#2E7D32" },
  category: { color: "#666" },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
});
