// screens/LoginScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { saveToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";
import { sendTokenToBackend } from "../utils/api";

WebBrowser.maybeCompleteAuthSession();

// Helper cross-platform para mostrar mensajes
function showToast(message) {
  if (Platform.OS === "android") {
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS / web
    try {
      Alert.alert("", message);
    } catch (e) {
      console.log("Toast:", message);
    }
  }
}

export default function LoginScreen({ navigation }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [loading, setLoading] = useState(false);

  // === CONFIG GOOGLE (reemplaza por tus valores reales) ===
  // Sustituye estos campos por los client IDs que te entregue Google Cloud Console.
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_GOOGLE_CLIENT_ID_EXPO",
    iosClientId: "YOUR_GOOGLE_IOS_CLIENT_ID",
    androidClientId: "YOUR_GOOGLE_ANDROID_CLIENT_ID",
    webClientId: "YOUR_GOOGLE_WEB_CLIENT_ID",
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      handleGoogleResponse(authentication);
    } else if (response?.type === "error") {
      showToast("Error en autenticación con Google");
    }
  }, [response]);

  async function handleGoogleResponse(authentication) {
    setLoading(true);
    try {
      // Intentamos obtener id_token (algunas configuraciones lo ponen en response.params.id_token)
      const id_token = response?.params?.id_token || null;
      if (!id_token && !authentication?.accessToken) {
        showToast("No se obtuvo token de Google");
        setLoading(false);
        return;
      }

      const body = id_token ? { id_token } : { access_token: authentication.accessToken };

      // Llama a tu endpoint que intercambia/valida el token de Google y devuelve tu JWT
      const res = await axios.post(`http://${BASE_URL}/auth/google`, body, { timeout: 10000 });

      const token = res.data?.access_token || res.data?.token || null;
      if (!token) {
        showToast("Respuesta inválida del servidor al autenticar con Google");
        setLoading(false);
        return;
      }

      await saveToken(token);
      // opcional: await sendTokenToBackend(res.data);

      showToast("¡Login con Google exitoso!");
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err) {
      console.warn("google login error:", err?.response?.data || err.message || err);
      const status = err?.response?.status;
      if (status) {
        showToast(`Error servidor: ${status}`);
      } else {
        showToast("Error autenticando con Google o con el servidor");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onLogin() {
    if (!usuario || !contrasena) {
      showToast("Completa ambos campos");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `http://${BASE_URL}/login`,
        { username: usuario, password: contrasena },
        { timeout: 8000 }
      );

      const token = res.data?.access_token || res.data?.token || null;
      if (!token) {
        showToast("Respuesta inválida del servidor");
        setLoading(false);
        return;
      }

      await saveToken(token);
      // opcional: await sendTokenToBackend(res.data);

      showToast("¡Bienvenido!");
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err) {
      console.warn("LOGIN axios error:", err?.response || err.message || err);
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 401) {
        showToast("Credenciales inválidas (401). Verifica usuario/contraseña.");
      } else if (status) {
        showToast(`Error servidor: ${status} - ${JSON.stringify(data)}`);
      } else {
        showToast("Error de conexión o timeout");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require("../assets/logo.jpeg")} style={styles.logo} />
      <Text style={styles.subtitle}>Decide mejor, consume mejor</Text>

      <Text style={styles.label}>Usuario</Text>
      <TextInput
        value={usuario}
        onChangeText={setUsuario}
        placeholder="Ingresa tu usuario"
        style={styles.input}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        value={contrasena}
        onChangeText={setContrasena}
        placeholder="Ingresa tu contraseña"
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#A6C800" }]}
        onPress={onLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Iniciar Sesión</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={[styles.link, { marginTop: 12 }]}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>

      <Text style={[styles.smallText, { marginTop: 18 }]}>O inicia sesión con</Text>

      <TouchableOpacity
        style={styles.googleBtn}
        onPress={() => {
          if (!request) {
            showToast("Provider Google no configurado correctamente");
            return;
          }
          promptAsync();
        }}
        disabled={loading}
      >
        <Image source={require("../assets/google-logo.png")} style={styles.googleLogo} />
        <Text style={styles.googleText}>Continuar con Google</Text>
      </TouchableOpacity>

      <Text style={[styles.smallText, { marginTop: 20 }]}>¿Olvidaste tu contraseña?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center" },
  logo: { width: 120, height: 120, marginBottom: 10, resizeMode: "contain" },
  subtitle: { textAlign: "center", marginBottom: 20, fontSize: 16, color: "#333" },
  label: { alignSelf: "flex-start", color: "#000", marginBottom: 4 },
  input: { width: "100%", borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { width: "100%", height: 50, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 8 },
  buttonText: { color: "#000", fontWeight: "700" },
  link: { color: "#007B00", textAlign: "center" },
  smallText: { color: "#666", fontSize: 12, textAlign: "center" },
  googleBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", marginTop: 10, width: "100%", justifyContent: "center" },
  googleLogo: { width: 20, height: 20, marginRight: 10 },
  googleText: { fontWeight: "700" },
});
