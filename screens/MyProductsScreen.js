// screens/MyProductsScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  Button,
  ScrollView,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import RNPickerSelect from "react-native-picker-select";
import { getToken, getCurrentUserId, clearToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";

const CATEGORIES = [
  { label: "Alimentos", value: "Alimentos" },
  { label: "Ropa", value: "Ropa" },
  { label: "Tecnologia", value: "Tecnologia" },
  { label: "Limpieza", value: "Limpieza" },
  { label: "Hogar", value: "Hogar" },
  { label: "Salud", value: "Salud" },
  { label: "Papeleria", value: "Papeleria" },
  { label: "Otro", value: "Otro" },
];

export default function MyProductsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [rawResponseCount, setRawResponseCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch products
  const extractCreatedBy = (p) => {
    if (p == null) return null;
    if (typeof p === "number" || typeof p === "string") return p;
    if (typeof p === "object") return p.id ?? p.user_id ?? p.userId ?? p.created_by ?? null;
    return null;
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      console.log("BASE_URL ->", BASE_URL);
      const token = await getToken();
      console.log("[MyProducts] token:", token);
      const uid = await getCurrentUserId(token);
      console.log("[MyProducts] decoded userId:", uid);
      setUserId(uid);

      if (!BASE_URL) throw new Error("BASE_URL no definido en utils/const.js");
      const url = `http://${BASE_URL}/products/get`;
      console.log("[MyProducts] fetch url:", url);

      const authHeader = token ? `Bearer ${token.replace(/^Bearer\s+/i, "")}` : undefined;
      const res = await fetch(url, {
        method: "GET",
        headers: authHeader ? { Authorization: authHeader } : {},
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} - ${text}`);
      }

      const arr = await res.json();
      setRawResponseCount(arr?.length ?? 0);

      // require login
      if (!uid) {
        setProducts([]);
        setErrorMsg("No has iniciado sesión. Inicia sesión para ver solo tus productos.");
        return;
      }

      const filtered = (arr || []).filter((p) => {
        const cbCandidate = extractCreatedBy(
          p.created_by ?? p.createdBy ?? p.creator ?? p.user ?? p
        );
        return String(cbCandidate) === String(uid);
      });

      setProducts(filtered);
    } catch (e) {
      console.error("[MyProducts] Error cargando productos:", e);
      if (
        String(e).includes("Failed to fetch") ||
        String(e).includes("Network request failed") ||
        String(e).includes("name not resolved")
      ) {
        setErrorMsg("Error de red: no se pudo conectar al servidor. Revisa BASE_URL y la red.");
      } else {
        setErrorMsg(e.message || "Error desconocido");
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) loadProducts();
    const unsub = navigation.addListener("focus", loadProducts);
    return () => unsub && unsub();
  }, [loadProducts, isFocused, navigation]);

  // DELETE product
  const deleteProduct = async (productId) => {
    const token = await getToken();
    if (!token) return Alert.alert("Error", "No autorizado.");
    Alert.alert("Eliminar producto", "¿Seguro que deseas eliminar este producto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const url = `http://${BASE_URL}/products/${productId}`;
            const res = await fetch(url, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
            });
            if (res.ok) {
              showToast("Producto eliminado");
              loadProducts();
            } else {
              const txt = await res.text();
              showToast("No se pudo eliminar: " + txt);
            }
          } catch (e) {
            console.error("deleteProduct error:", e);
            showToast("Error eliminando producto");
          }
        },
      },
    ]);
  };

 // Reemplaza tu updateProduct por esto (mantén el resto igual)
const updateProduct = async ({
  productId,
  name,
  category,
  price,
  quantity,
  carbonFootprint,
  recyclablePackaging,
  localOrigin,
  status,
  imageUri,
}) => {
  setSaving(true);
  try {
    const token = await getToken();
    if (!token) {
      showToast("No autorizado");
      setSaving(false);
      return false;
    }

    // === VALIDACIONES CLIENT ===
    if (!name || !category) {
      showToast("Nombre y categoría son obligatorios");
      setSaving(false);
      return false;
    }
    // convertir y validar numéricos
    const priceNum = Number(String(price).replace(",", "."));
    const qtyNum = Number(String(quantity));
    const carbonNum = Number(String(carbonFootprint).replace(",", "."));
    if (isNaN(priceNum) || isNaN(qtyNum) || isNaN(carbonNum)) {
      showToast("Precio, cantidad o huella inválidos");
      setSaving(false);
      return false;
    }

    // === CONSTRUIR FORMDATA ===
    const formData = new FormData();
    formData.append("name", String(name));
    formData.append("category", String(category));
    formData.append("price", String(priceNum)); // backend espera number -> enviar texto está OK
    formData.append("quantity", String(parseInt(qtyNum, 10)));
    formData.append("carbon_footprint", String(carbonNum));
    // enviar booleanos como "true"/"false" (si tu backend requiere otra cosa, lo ajustamos)
    formData.append("recyclable_packaging", recyclablePackaging ? "true" : "false");
    formData.append("local_origin", localOrigin ? "true" : "false");
    formData.append("status", String(status ?? "disponible"));

    // Si seleccionó nueva imagen, agregarla. Si no, NO tocar 'image'
    if (imageUri) {
      const uri = imageUri;
      const nameParts = uri.split("/");
      const filename = nameParts[nameParts.length - 1] || `photo_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : "jpg";
      const type = `image/${ext === "jpg" ? "jpeg" : ext}`;

      // RN/Expo: mandar objeto { uri, name, type }
      formData.append("image", {
        uri,
        name: filename,
        type,
      });
    }

    // === ENVIAR ===
    const url = `http://${BASE_URL}/products/${productId}`;
    console.log("[updateProduct] PUT", url);
    // Important: no set Content-Type -> RN will set the boundary
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
        // Accept opcional: "application/json"
      },
      body: formData,
    });

    const bodyText = await res.text(); // lee siempre el body para debug
    console.log("[updateProduct] status:", res.status, "body:", bodyText);

    // Backend puede devolver JSON de error; intenta parsear
    let parsed;
    try { parsed = JSON.parse(bodyText); } catch (e) { parsed = null; }

    if (res.ok) {
      showToast("Producto actualizado");
      loadProducts();
      setEditVisible(false);
      setSaving(false);
      return true;
    } else {
      // Si recibes 422 valida 'parsed' — normalmente tiene detalles de validación
      const errMsg = parsed?.detail || parsed?.message || bodyText || `HTTP ${res.status}`;
      console.warn("[updateProduct] error detalle:", errMsg);
      Alert.alert("Error actualización", String(errMsg));
      setSaving(false);
      return false;
    }
  } catch (e) {
    console.error("updateProduct exception:", e);
    Alert.alert("Error", "Error al actualizar producto: " + (e.message || e));
    setSaving(false);
    return false;
  }
};

  // Image picker (for edit)
  const pickImage = async (setImageUri) => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso denegado", "Necesitas dar permiso para acceder a la galería.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        // expo-image-picker v14 uses result.assets
        const uri = result.assets ? result.assets[0].uri : result.uri;
        setImageUri(uri);
      }
    } catch (e) {
      console.error("pickImage error:", e);
    }
  };

  // Small cross-platform toast
  const showToast = (msg) => {
    if (Platform.OS === "android") {
      const { ToastAndroid } = require("react-native");
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("", msg);
    }
  };

  // open edit modal
  const openEdit = (product) => {
    setEditingProduct({
      ...product,
      // local editable fields
      priceText: String(product.price ?? "0"),
      quantityText: String(product.quantity ?? "1"),
      carbonText: String(product.carbon_footprint ?? "0"),
      recyclable: !!product.recyclable_packaging,
      localOrigin: !!product.local_origin,
      status: product.status ?? "disponible",
      newImageUri: null, // selected new image
    });
    setEditVisible(true);
  };

  // submit edit
  const onSaveEdit = async () => {
    if (!editingProduct) return;
    // validations
    const price = parseFloat(editingProduct.priceText.replace(",", "."));
    const quantity = parseInt(editingProduct.quantityText);
    const carbon = parseFloat(editingProduct.carbonText.replace(",", "."));
    if (!editingProduct.name) return showToast("Nombre requerido");
    if (!editingProduct.category) return showToast("Categoría requerida");
    if (isNaN(price) || price <= 0) return showToast("Precio inválido");
    if (isNaN(quantity) || quantity < 0) return showToast("Cantidad inválida");
    if (isNaN(carbon) || carbon < 0) return showToast("Huella inválida");

    const success = await updateProduct({
      productId: editingProduct.id,
      name: editingProduct.name,
      category: editingProduct.category,
      price,
      quantity,
      carbonFootprint: carbon,
      recyclablePackaging: editingProduct.recyclable,
      localOrigin: editingProduct.localOrigin,
      status: editingProduct.status,
      imageUri: editingProduct.newImageUri, // if null => keep existing
    });

    if (success) {
      setEditingProduct(null);
      setEditVisible(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetail", { id: item.id })}
    >
      <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      <Text style={styles.title} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.subtitle}>
        {item.category} • ${Number(item.price).toFixed(2)}
      </Text>

      <View style={styles.rowButtons}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
          <Text style={{ color: "#6BAA00", fontWeight: "700" }}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteProduct(item.id)} style={styles.iconBtn}>
          <Text style={{ color: "red", fontWeight: "700" }}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Header with hamburger + title + add button
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburger}>
        <View style={styles.hamLine} />
        <View style={[styles.hamLine, { width: 18 }]} />
        <View style={[styles.hamLine, { width: 14 }]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Mis Productos</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("AddProduct")}
        style={styles.addButton}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Agregar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.debugRow}>
        <Text style={styles.debugText}>userId: {userId ?? "null"}</Text>
        <Text style={styles.debugText}>API returned: {rawResponseCount}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#A6C800" style={{ marginTop: 30 }} />
      ) : errorMsg ? (
        <View style={styles.empty}>
          <Text style={{ color: "red", textAlign: "center", marginBottom: 12 }}>{errorMsg}</Text>
          <Button title="Ir a iniciar sesión" onPress={() => navigation.navigate("Login")} />
          <Button title="Reintentar" onPress={loadProducts} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: "gray" }}>Aún no has publicado ningún artículo</Text>
          <Text style={{ color: "#999", marginTop: 8, textAlign: "center" }}>
            Si esperas ver productos, revisa:
            {"\n"}• Que hayas iniciado sesión y que tu cuenta haya publicado productos.
            {"\n"}• Pulsa Reintentar si acabas de crear uno.
          </Text>
          <Button title="Reintentar" onPress={loadProducts} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(i) => String(i.id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 8 }}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Editar producto</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={editingProduct?.name ?? ""}
            onChangeText={(t) => setEditingProduct((p) => ({ ...p, name: t }))}
          />

          <View style={{ width: "100%", marginBottom: 10 }}>
            <RNPickerSelect
              onValueChange={(value) => setEditingProduct((p) => ({ ...p, category: value }))}
              items={CATEGORIES}
              value={editingProduct?.category ?? null}
              placeholder={{ label: "Selecciona una Categoría...", value: null }}
              style={pickerSelectStyles}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Precio"
            keyboardType="numeric"
            value={editingProduct?.priceText ?? ""}
            onChangeText={(t) => setEditingProduct((p) => ({ ...p, priceText: t }))}
          />

          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            keyboardType="numeric"
            value={editingProduct?.quantityText ?? ""}
            onChangeText={(t) => setEditingProduct((p) => ({ ...p, quantityText: t }))}
          />

          <TextInput
            style={styles.input}
            placeholder="Huella de carbono"
            keyboardType="numeric"
            value={editingProduct?.carbonText ?? ""}
            onChangeText={(t) => setEditingProduct((p) => ({ ...p, carbonText: t }))}
          />

          <View style={styles.switchRow}>
            <Text>Empaque reciclable</Text>
            <Switch
              value={!!editingProduct?.recyclable}
              onValueChange={(v) => setEditingProduct((p) => ({ ...p, recyclable: v }))}
            />
          </View>

          <View style={styles.switchRow}>
            <Text>Origen local</Text>
            <Switch
              value={!!editingProduct?.localOrigin}
              onValueChange={(v) => setEditingProduct((p) => ({ ...p, localOrigin: v }))}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Status (disponible / agotado)"
            value={editingProduct?.status ?? ""}
            onChangeText={(t) => setEditingProduct((p) => ({ ...p, status: t }))}
          />

          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 10 }}>
            <Image
              source={{ uri: editingProduct?.newImageUri ?? editingProduct?.image_url }}
              style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: "#eee", marginRight: 12 }}
            />
            <Button title="Seleccionar imagen" onPress={() => pickImage((uri) => setEditingProduct((p) => ({ ...p, newImageUri: uri })))} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 12 }}>
            <Button title="Cancelar" color="#999" onPress={() => setEditVisible(false)} />
            <Button title={saving ? "Guardando..." : "Guardar"} onPress={onSaveEdit} disabled={saving} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, borderColor: "#eee" },
  hamburger: { padding: 8 },
  hamLine: { width: 22, height: 2, backgroundColor: "#333", marginVertical: 2 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#2E7D32" },
  addButton: { backgroundColor: "#6BAA00", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  debugRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fafafa", borderBottomWidth: 1, borderColor: "#eee" },
  debugText: { color: "#666", fontSize: 12 },
  card: { backgroundColor: "#DDF0B4", borderRadius: 10, padding: 8, marginBottom: 12, width: "48%" },
  image: { width: "100%", height: 100, borderRadius: 8, marginBottom: 8, backgroundColor: "#eee" },
  title: { fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 12, color: "#333" },
  rowButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  modalContent: { padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#2E7D32", marginBottom: 12 },
  input: { width: "100%", borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 8, marginBottom: 10 },
  switchRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: "black",
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "black",
    paddingRight: 30,
  },
};
