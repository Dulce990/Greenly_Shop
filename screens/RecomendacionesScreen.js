import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";

/**
 RecomendacionesScreen.js
 Adaptación de tu componente React -> React Native
 - Trae recomendaciones: GET http://BASE_URL/modelo/entrenar
 - Comprar ahora: POST http://BASE_URL/transactions/buy
 - Agregar al carrito: POST http://BASE_URL/cart/add
 - Registrar interacción: POST http://BASE_URL/interacciones
*/

export default function RecomendacionesScreen({ navigation }) {
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [cantidades, setCantidades] = useState({});
  const [loading, setLoading] = useState(true);
  const [alertModal, setAlertModal] = useState({ open: false, message: "" });
  const [token, setToken] = useState(null);

  // Carga token y recomendaciones
  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (!t) {
        setMensaje("Debes iniciar sesión para ver recomendaciones.");
        setLoading(false);
        return;
      }
      setToken(t);
      await obtenerRecomendaciones(t);
    })();
  }, []);

  const obtenerRecomendaciones = useCallback(
    async (tkn) => {
      setMensaje("");
      setRecomendaciones([]);
      setLoading(true);

      const t = tkn || token;
      if (!t) {
        setMensaje("Debes iniciar sesión para ver recomendaciones.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`http://${BASE_URL}/modelo/entrenar`, {
          headers: { Authorization: `Bearer ${t}` },
          timeout: 15000,
        });
        // En tu versión web accedías a res.data.recomendaciones.recomendaciones
        const data = res.data?.recomendaciones?.recomendaciones ?? res.data ?? [];
        setRecomendaciones(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn("obtenerRecomendaciones error:", error?.response || error?.message || error);
        setMensaje(error?.response?.data?.detail || "No se pudieron obtener recomendaciones.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const handleCantidadChange = (id, value) => {
    // limitar a enteros positivos
    const val = Number(value) || 0;
    setCantidades((prev) => ({ ...prev, [id]: Math.max(1, Math.floor(val)) }));
  };

  const comprarAhora = async (prod) => {
    if (!token) return setAlertModal({ open: true, message: "No autenticado." });
    const qty = cantidades[prod.id] || 1;
    setLoading(true);
    try {
      const res = await axios.post(
        `http://${BASE_URL}/transactions/buy`,
        { product_id: prod.id, quantity: qty },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
      );
      setAlertModal({
        open: true,
        message: res.data?.message || "✅ Has comprado este producto.",
      });
      // refrescar recomendaciones
      await obtenerRecomendaciones();
    } catch (err) {
      console.warn("comprarAhora error:", err?.response || err?.message || err);
      setAlertModal({
        open: true,
        message: err?.response?.data?.detail || "❌ Error al comprar producto",
      });
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = async (prod) => {
    if (!token) return setAlertModal({ open: true, message: "No autenticado." });
    const qty = cantidades[prod.id] || 1;
    try {
      const res = await axios.post(
        `http://${BASE_URL}/cart/add`,
        { product_id: prod.id, quantity: qty },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      setAlertModal({
        open: true,
        message: `✅ ${prod.name} agregado al carrito (x${qty})`,
      });
    } catch (err) {
      console.warn("agregarAlCarrito error:", err?.response || err?.message || err);
      setAlertModal({
        open: true,
        message: err?.response?.data?.detail || "❌ Error al agregar al carrito",
      });
    }
  };

  // Registrar interacción y navegar a comentarios
  const handleProductClick = async (prod) => {
    if (token) {
      try {
        await axios.post(
          `http://${BASE_URL}/interacciones`,
          { product_id: prod.id, action: "click" },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
        );
      } catch (err) {
        console.warn("Error registrando interacción:", err?.response || err?.message || err);
      }
    }
    // Navegar al screen 'Comments' pasando product id como param
    navigation.navigate("Comments", { product: prod.id });
  };

  const renderProduct = ({ item: prod }) => {
    const qty = cantidades[prod.id] || 1;
    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleProductClick(prod)}
          style={styles.productClickable}
        >
          {prod.image_url ? (
            <Image source={{ uri: prod.image_url }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholder]}>
              <Text style={styles.placeholderText}>No image</Text>
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {prod.name}
            </Text>
            <Text style={styles.small}>Categoría: <Text style={styles.boldText}>{prod.category ?? "-"}</Text></Text>
            <Text style={styles.small}>Precio: <Text style={styles.boldText}>${Number(prod.price ?? 0).toFixed(2)}</Text></Text>
            {prod.quantity !== undefined && <Text style={styles.small}>Stock: <Text style={styles.boldText}>{prod.quantity}</Text></Text>}
            {prod.score !== undefined && <Text style={styles.small}>Score: <Text style={styles.boldText}>{Number(prod.score).toFixed(2)}</Text></Text>}
            {prod.carbon_footprint !== undefined && <Text style={styles.small}>Huella CO₂: <Text style={styles.boldText}>{prod.carbon_footprint} kg</Text></Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <View style={styles.qtyWrapper}>
            <Text style={styles.qtyLabel}>Cantidad</Text>
            <TextInput
              style={styles.qtyInput}
              keyboardType="number-pad"
              value={String(qty)}
              onChangeText={(t) => handleCantidadChange(prod.id, t)}
              maxLength={4}
            />
          </View>

          <View style={styles.buttonsWrapper}>
            <TouchableOpacity
              style={[styles.btn, styles.buyBtn]}
              onPress={() => comprarAhora(prod)}
            >
              <Text style={styles.btnText}>Comprar ahora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.cartBtn]}
              onPress={() => agregarAlCarrito(prod)}
            >
              <Text style={styles.btnText}>Agregar 🛒</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Header con botón para abrir drawer (igual que MyProfile)
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // usamos topBar dentro del componente
    });
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburgerBtn}>
            <Ionicons name="menu" size={26} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.headerTitleCentered}>Recomendaciones</Text>
          <View style={{ width: 40 }} />
        </View>

        {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={recomendaciones}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={() => (
              <View style={styles.center}>
                <Text>No hay recomendaciones por el momento.</Text>
              </View>
            )}
          />
        )}

        {/* Modal simple para mensajes */}
        <Modal
          visible={alertModal.open}
          animationType="fade"
          transparent
          onRequestClose={() => setAlertModal({ open: false, message: "" })}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setAlertModal({ open: false, message: "" })}
          >
            <View style={styles.modalContent}>
              <Text style={{ marginBottom: 12 }}>{alertModal.message}</Text>
              <TouchableOpacity style={[styles.btn, { alignSelf: "stretch" }]} onPress={() => setAlertModal({ open: false, message: "" })}>
                <Text style={styles.btnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleCentered: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
  message: { color: "#b00020", marginBottom: 8, textAlign: "center" },

  listContainer: { paddingBottom: 24, paddingTop: 4 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  productCard: {
    backgroundColor: "#F8FFF2",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e6f1df",
  },
  productClickable: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
  },
  productImage: { width: 90, height: 90, borderRadius: 8, marginRight: 10, backgroundColor: "#ddd" },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#666" },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 16, fontWeight: "700", color: "#2E7D32", marginBottom: 4 },
  small: { fontSize: 12, color: "#333", marginTop: 2 },
  boldText: { fontWeight: "700" },

  actionsRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyWrapper: { width: 100 },
  qtyLabel: { fontSize: 12, marginBottom: 4 },
  qtyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "center",
  },

  buttonsWrapper: { flex: 1, marginLeft: 12, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginLeft: 6 },
  buyBtn: { backgroundColor: "#6BAA00" },
  cartBtn: { backgroundColor: "#2E7D32" },
  btnText: { color: "#fff", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
});
