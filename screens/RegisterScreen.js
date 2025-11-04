// screens/RegisterScreen.js (instrumentado)
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  ActivityIndicator,
  Image,
} from "react-native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import BASE_URL from "../utils/const";

export default function RegisterScreen({ navigation }) {
  const [usuario, setUsuario] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  const defaultImageUrl =
    "https://res.cloudinary.com/dkerhtvlk/image/upload/v1753410801/fotoDefault_uegm43.jpg";

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      ToastAndroid.show("Permiso de galería denegado", ToastAndroid.SHORT);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  }

  async function onRegister() {
    if (!usuario || !correo || !contrasena) {
      ToastAndroid.show("Completa todos los campos", ToastAndroid.SHORT);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", usuario);
      formData.append("email", correo);
      formData.append("password", contrasena);
      formData.append("status", "Active");

      if (imageUri) {
        const uriParts = imageUri.split(".");
        const ext = uriParts[uriParts.length - 1];
        const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        formData.append("image", {
          uri: imageUri,
          name: `photo.${ext}`,
          type: mimeType,
        });
      }

      const url = `http://${BASE_URL}/register`;
      console.log("[REGISTER] URL:", url);
      console.log("[REGISTER] formData keys:", Array.from(formData._parts ? formData._parts.map(p=>p[0]) : []));
      // (1) Intento con axios
      try {
        console.log("[REGISTER] Sending with axios...");
        const res = await axios.post(url, formData, {
          timeout: 12000,
          headers: {
            // NO poner Content-Type aquí
          },
        });
        console.log("[REGISTER] axios response:", res.status, res.data);
        ToastAndroid.show("Registrado correctamente", ToastAndroid.SHORT);
        navigation.navigate("Login");
        setLoading(false);
        return;
      } catch (axiosErr) {
        console.warn("[REGISTER] axios error:", axiosErr?.message);
        if (axiosErr?.response) {
          console.warn("[REGISTER] axios response data:", axiosErr.response.data);
          // mostrar detalle si viene
          if (axiosErr.response.status === 422 && axiosErr.response.data?.detail) {
            const details = axiosErr.response.data.detail;
            const msg =
              Array.isArray(details) && details.length
                ? details.map((d) => (d?.msg ? d.msg : JSON.stringify(d))).join("\n")
                : JSON.stringify(details);
            ToastAndroid.show(msg, ToastAndroid.LONG);
          } else {
            ToastAndroid.show(`Error ${axiosErr.response.status}: ${JSON.stringify(axiosErr.response.data)}`, ToastAndroid.LONG);
          }
        } else {
          ToastAndroid.show("Network/axios error: " + axiosErr.message, ToastAndroid.LONG);
        }
        // Intento (2) con fetch como fallback (muestra logs también)
        try {
          console.log("[REGISTER] Fallback: sending with fetch...");
          const fetchRes = await fetch(url, {
            method: "POST",
            body: formData,
            // Do NOT set content-type
          });
          const text = await fetchRes.text();
          console.log("[REGISTER] fetch status:", fetchRes.status, "body:", text);
          if (fetchRes.ok) {
            ToastAndroid.show("Registrado correctamente (fetch)", ToastAndroid.SHORT);
            navigation.navigate("Login");
          } else {
            ToastAndroid.show(`Error fetch ${fetchRes.status}: ${text}`, ToastAndroid.LONG);
          }
        } catch (fetchErr) {
          console.error("[REGISTER] fetch error:", fetchErr);
          ToastAndroid.show("Error de red al intentar fetch: " + fetchErr.message, ToastAndroid.LONG);
        }
      }
    } catch (e) {
      console.error("[REGISTER] unexpected error:", e);
      ToastAndroid.show("Error inesperado: " + (e.message || e), ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TouchableOpacity onPress={pickImage} style={{ alignSelf: "center", marginBottom: 12 }}>
        <Image
          source={{ uri: imageUri || defaultImageUrl }}
          style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 8 }}
        />
        <Text style={{ textAlign: "center", color: "#007B00" }}>Seleccionar foto</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Usuario</Text>
      <TextInput value={usuario} onChangeText={setUsuario} placeholder="Nombre de usuario" style={styles.input} autoCapitalize="none" />

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput value={correo} onChangeText={setCorreo} placeholder="user@example.com" keyboardType="email-address" style={styles.input} autoCapitalize="none" />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput value={contrasena} onChangeText={setContrasena} placeholder="Contraseña" secureTextEntry style={styles.input} />

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={onRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Registrarse</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 16 }}>
        <Text style={styles.link}>← Ya tengo cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const verdeOscuro = "#6BAA00";
const verdeClaro = "#DDF0B4";
const verdeButton = "#A6C800";
const verdeLink = "#007B00";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", color: verdeOscuro, marginBottom: 20 },
  label: { color: "#000", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", backgroundColor: verdeClaro, borderRadius: 8, padding: 10, marginBottom: 12 },
  button: { backgroundColor: verdeButton, paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#000", fontWeight: "700" },
  link: { color: verdeLink, textAlign: "center", fontWeight: "500" },
});
