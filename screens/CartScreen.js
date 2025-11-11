// screens/CartScreen.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { getToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";

function showToast(msg) {
  if (Platform.OS === "android") {
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show(String(msg), ToastAndroid.SHORT);
  } else {
    Alert.alert("", String(msg));
  }
}

export default function CartScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);
  const [snackMsg, setSnackMsg] = useState("");
  const snackAnim = useRef(new Animated.Value(0)).current;
  const [infoModal, setInfoModal] = useState({ open: false, message: "" });
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => { itemsRef.current = items; }, [items]);

  const showSnackbar = useCallback((message, duration = 2600) => {
    setSnackMsg(message);
    Animated.timing(snackAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => Animated.timing(snackAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(), duration);
  }, [snackAnim]);

  const extractProductId = (it) => {
    if (!it) return undefined;
    return it.product_id ?? it.cart_item_id ?? it.id ?? it.productId ?? it.product?.id ?? it.product?.product_id;
  };

  const total = items.reduce((acc, it) => acc + (Number(it.price || 0) * (Number(it.quantity || 0))), 0);

  const axiosInstance = axios.create({
    baseURL: `http://${BASE_URL}`,
    timeout: 10000,
    headers: { Accept: "application/json" },
  });

  const loadCart = useCallback(async (tkn) => {
    const t = tkn ?? token;
    if (!t) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      console.log("[CartScreen] GET", `http://${BASE_URL}/cart/mycart`);
      const res = await axiosInstance.get(`/cart/mycart`, { headers: { Authorization: `Bearer ${t}` } });
      console.log("[CartScreen] GET res:", res.status);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("[CartScreen] loadCart error:", err?.response || err?.message || err);
      showSnackbar("Error cargando carrito");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (!t) { showToast("No estás autenticado"); setLoading(false); return; }
      setToken(t);
      await loadCart(t);
    })();

    const unsub = navigation.addListener("focus", async () => {
      const t = await getToken();
      setToken(t);
      await loadCart(t);
    });
    return unsub;
  }, [navigation, loadCart]);

  const attemptDelete = async (idToDelete, t) => {
    try {
      console.log("[CartScreen] trying axios DELETE /cart/remove/", idToDelete);
      const res = await axiosInstance.delete(`/cart/remove/${idToDelete}`, { headers: { Authorization: `Bearer ${t}` } });
      console.log("[CartScreen] delete axios ok", res.status, res.data);
      return { ok: true, data: res.data };
    } catch (err) {
      console.warn("[CartScreen] delete axios failed:", err?.response?.status || err?.message || err);
    }

    try {
      console.log("[CartScreen] trying fetch DELETE /cart/remove/", idToDelete);
      const response = await fetch(`http://${BASE_URL}/cart/remove/${idToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
      });
      const text = await response.text();
      let parsed;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
      console.log("[CartScreen] fetch delete status", response.status, parsed);
      if (response.ok) return { ok: true, data: parsed };
    } catch (err) {
      console.warn("[CartScreen] fetch delete failed:", err);
    }

    return { ok: false };
  };

  // --- MODIFICACIÓN IMPORTANTE: eliminación IMEDIATA (como en web)
  const removeFromCart = async (productId) => {
    console.log("[CartScreen] trash pressed, productId:", productId);
    if (!token) { showSnackbar("No estás autenticado"); return; }
    if (productId === undefined || productId === null) { showSnackbar("ID inválido"); return; }
    const sid = String(productId);
    if (deletingIds.includes(sid)) return;

    const prevItems = Array.isArray(itemsRef.current) ? itemsRef.current.slice() : items.slice();
    setDeletingIds(prev => [...prev, sid]);
    // Optimistic UI: quitar del frontend inmediatamente
    setItems(prev => prev.filter(it => String(extractProductId(it)) !== sid));

    try {
      let result = await attemptDelete(sid, token);

      if (!result.ok) {
        const found = prevItems.find(it => String(extractProductId(it)) === sid);
        const altIds = [];
        if (found) {
          if (found.cart_item_id) altIds.push(String(found.cart_item_id));
          if (found.id) altIds.push(String(found.id));
          if (found.product?.id) altIds.push(String(found.product.id));
        }
        const uniqueAlt = [...new Set(altIds.filter(Boolean))];
        for (const alt of uniqueAlt) {
          result = await attemptDelete(alt, token);
          if (result.ok) break;
        }
      }

      if (result.ok) {
        const msg = result.data?.message || "🗑️ Producto eliminado del carrito.";
        showSnackbar(msg);
        await loadCart();
      } else {
        // rollback si fallo
        setItems(prevItems);
        showSnackbar("Error al eliminar producto (no se alcanzó el backend)");
      }
    } catch (err) {
      console.warn("[CartScreen] removeFromCart final error:", err);
      setItems(prevItems);
      showSnackbar("Error al eliminar producto");
    } finally {
      setDeletingIds(prev => prev.filter(x => x !== sid));
    }
  };

  const clearCart = async () => {
    if (!token) return showSnackbar("No estás autenticado");
    // mantengo confirmación porque vaciar es más crítico
    Alert.alert("Vaciar carrito", "¿Seguro que quieres vaciar todo el carrito?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Vaciar",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("[CartScreen] DELETE", `http://${BASE_URL}/cart/clear`);
            const res = await axiosInstance.delete(`/cart/clear`, { headers: { Authorization: `Bearer ${token}` } });
            console.log("[CartScreen] clear res", res.status);
            setItems([]);
            setInfoModal({ open: true, message: "🛒 Carrito vaciado." });
          } catch (err) {
            console.warn("[CartScreen] clearCart error:", err?.response || err?.message || err);
            showSnackbar("Error al vaciar carrito");
          }
        }
      }
    ]);
  };

  const purchaseCart = async () => {
    if (!token) return showSnackbar("No estás autenticado");
    if (items.length === 0) return showSnackbar("Carrito vacío");
    Alert.alert("Comprar carrito", `Total: $${total.toFixed(2)}\n¿Deseas continuar?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Comprar",
        onPress: async () => {
          try {
            console.log("[CartScreen] POST", `http://${BASE_URL}/cart/purchase`);
            const res = await axiosInstance.post(`/cart/purchase`, {}, { headers: { Authorization: `Bearer ${token}` } });
            console.log("[CartScreen] purchase res", res.status, res.data);
            const { message, products } = res.data || {};
            let summary = message ? String(message) + "\n" : "Compra procesada\n";
            if (products) {
              if (products.purchased?.length) summary += `✅ Comprados: ${products.purchased.map(p => `Producto ${p.product_id} (x${p.quantity})`).join(", ")}\n`;
              if (products.skipped?.length) summary += `⚠️ No comprados: ${products.skipped.map(s => `Producto ${s.product_id} (${s.reason})`).join(", ")}`;
            }
            setInfoModal({ open: true, message: summary });
            await loadCart();
            setSuccessModalVisible(true);
          } catch (err) {
            console.warn("[CartScreen] purchaseCart error:", err?.response || err?.message || err);
            const msg = err?.response?.data?.detail || "❌ Error al realizar la compra.";
            setInfoModal({ open: true, message: String(msg) });
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const pid = extractProductId(item);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="image" size={28} color="#999" />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.small}>Cantidad: {item.quantity}</Text>
            <Text style={styles.small}>Precio unit: ${Number(item.price || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.actions}>
            {deletingIds.includes(String(pid)) ? (
              <ActivityIndicator size="small" color="#d32f2f" />
            ) : (
              // log inmediato al presionar
              <TouchableOpacity onPress={() => { console.log("[CartScreen] trash pressed (UI) pid:", pid); removeFromCart(pid); }} style={styles.iconBtn}>
                <Ionicons name="trash" size={22} color="#d32f2f" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer && navigation.openDrawer()} style={styles.hamburgerBtn}>
          <Ionicons name="menu" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitleCentered}>Mi carrito</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <>
          {items.length === 0 ? (
            <View style={[styles.center, { padding: 20 }]}>
              <Text style={{ color: "#666" }}>Tu carrito está vacío</Text>
              <TouchableOpacity style={[styles.btn, { marginTop: 12 }]} onPress={() => navigation.navigate("Home")}>
                <Text style={styles.btnText}>Seguir comprando</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={items}
                keyExtractor={(i) => String(extractProductId(i))}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
              />

              <View style={styles.totalBar}>
                <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity style={[styles.btn, { marginRight: 10 }]} onPress={purchaseCart}>
                    <Text style={styles.btnText}>Comprar carrito</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={clearCart}>
                    <Text style={styles.btnText}>Vaciar carrito</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </>
      )}

      <Modal transparent visible={infoModal.open} animationType="fade" onRequestClose={() => setInfoModal({ open: false, message: "" })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>Información</Text>
            <Text style={{ marginBottom: 12 }}>{infoModal.message}</Text>
            <TouchableOpacity style={[styles.btn, { alignSelf: "stretch" }]} onPress={() => setInfoModal({ open: false, message: "" })}>
              <Text style={styles.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={successModalVisible} animationType="fade" onRequestClose={() => setSuccessModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Compra realizada</Text>
            <Text style={{ marginBottom: 16 }}>Tu compra fue procesada con éxito 🎉</Text>
            <TouchableOpacity style={[styles.btn, { alignSelf: "stretch" }]} onPress={() => setSuccessModalVisible(false)}>
              <Text style={styles.btnText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {snackMsg ? (
        <Animated.View pointerEvents="none" style={[styles.snack, { opacity: snackAnim, transform: [{ translateY: snackAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
          <Text style={{ color: "#fff" }}>{snackMsg}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: { flexDirection: "row", alignItems: "center", padding: 12, justifyContent: "space-between" },
  hamburgerBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitleCentered: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#2E7D32" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#F8FFF2", marginVertical: 6, marginHorizontal: 12, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e6f1df" },
  row: { flexDirection: "row", padding: 10, alignItems: "center" },
  image: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#eee" },
  placeholder: { justifyContent: "center", alignItems: "center" },
  info: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#2E7D32" },
  small: { fontSize: 12, color: "#333", marginTop: 4 },
  actions: { justifyContent: "center", alignItems: "center" },
  iconBtn: { padding: 6 },
  totalBar: { position: "absolute", left: 0, right: 0, bottom: 12, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalText: { fontSize: 18, fontWeight: "700", marginRight: 12 },
  btn: { backgroundColor: "#6BAA00", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnAlt: { backgroundColor: "#A6C800" },
  btnText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 10, padding: 18, alignItems: "center" },
  snack: { position: "absolute", left: 20, right: 20, bottom: 24, backgroundColor: "#333", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
