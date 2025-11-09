import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { getToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dkerhtvlk/image/upload/v1753410801/fotoDefault_uegm43.jpg";

function showToast(msg) {
  if (Platform.OS === "android") {
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show(String(msg), ToastAndroid.SHORT);
  } else {
    Alert.alert("", String(msg));
  }
}

// Extraer userId desde JWT
function getUserIdFromToken(token) {
  try {
    const payload64 = token.split(".")[1];
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

export default function MyProfile({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (!t) {
        showToast("No estás autenticado");
        navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        return;
      }
      setToken(t);

      const id = getUserIdFromToken(t);
      if (!id) {
        showToast("No se pudo obtener user id desde el token");
        setLoading(false);
        return;
      }
      setUserId(id);
      await loadUser(t, id);
    })();
  }, []);

  async function loadUser(t, id) {
    if (!t || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`http://${BASE_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${t}` },
        timeout: 10000,
      });
      
      if (res.data) {
        setUser(res.data);
        setUsername(res.data.username || "");
        setEmail(res.data.email || "");
        setImageUri(res.data.profile_picture || null);
      }
    } catch (err) {
      console.warn("loadUser error:", err?.response || err?.message || err);
      showToast("Error cargando perfil");
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast("Permiso para la galería denegado");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.cancelled) {
        if (result.uri) setImageUri(result.uri);
        if (result.assets && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("pickImage error", e);
      showToast("Error seleccionando imagen");
    }
  }

  async function handleSave() {
    if (!token || !userId) return showToast("No autenticado");
    setSaving(true);
    try {
      const formData = new FormData();
      if (username) formData.append("username", username);
      if (email) formData.append("email", email);

      if (imageUri && imageUri !== user.profile_picture) {
        const uriParts = imageUri.split("/");
        const name = uriParts[uriParts.length - 1];
        const match = /\.(\w+)$/.exec(name);
        const ext = match ? match[1].toLowerCase() : "jpg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";

        formData.append("profile_picture", {
          uri: imageUri,
          name: `profile.${ext}`,
          type: mime,
        });
      }

      const res = await axios.put(`http://${BASE_URL}/users/${userId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 20000,
      });

      if (res.status >= 200 && res.status < 300) {
        showToast("Perfil actualizado");
        setEditMode(false);
        setUser((prev) => ({ ...prev, username, email, profile_picture: imageUri }));
      } else {
        showToast("Error actualizando perfil");
      }
    } catch (err) {
      console.warn("update error:", err?.response || err?.message || err);
      const msg = err?.response?.data?.detail || err?.response?.data || err?.message;
      showToast(msg ? String(msg) : "Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  if (!user)
    return (
      <View style={styles.center}>
        <Text>No se pudo cargar el perfil.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => loadUser(token, userId)}>
          <Text style={styles.btnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );

  const avatarSource = { uri: imageUri || user.profile_picture || DEFAULT_AVATAR };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburgerBtn}>
          <Ionicons name="menu" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitleCentered}>Mi perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <TouchableOpacity onPress={editMode ? pickImage : undefined} style={styles.avatarWrapper}>
          <Image source={avatarSource} style={styles.avatar} />
          {editMode && <Text style={styles.editHint}>Tocar para cambiar</Text>}
        </TouchableOpacity>

        {!editMode ? (
          <>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.small}>
              Registrado: {String(user.registration_date || "").slice(0, 10)}
            </Text>
            <TouchableOpacity
              style={[styles.btn, { marginTop: 20 }]}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.btnText}>Editar perfil</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Usuario"
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Correo"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar cambios</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#999", marginTop: 8 }]}
              onPress={() => setEditMode(false)}
            >
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { padding: 20, backgroundColor: "#F8FFF2", borderRadius: 12, alignItems: "center" },
  avatarWrapper: { alignItems: "center" },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#ddd" },
  editHint: { fontSize: 12, color: "#666", marginTop: 6 },
  username: { fontSize: 20, fontWeight: "700", color: "#2E7D32", marginTop: 12 },
  email: { fontSize: 14, color: "#333", marginTop: 6 },
  small: { fontSize: 12, color: "#666", marginTop: 6 },
  input: { width: "100%", borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 8, marginTop: 10 },
  btn: { marginTop: 12, backgroundColor: "#6BAA00", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  headerTitleCentered: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
});