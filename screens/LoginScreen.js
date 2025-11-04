// screens/LoginScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ToastAndroid,
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

export default function LoginScreen({ navigation }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [loading, setLoading] = useState(false);

  // === CONFIG GOOGLE (reemplaza por tus valores reales) ===
  // 1) Client ID para Android/iOS/Expo web según config en Google Cloud Console.
  // 2) En Expo Managed, suele usarse el clientId de tipo "OAuth 2.0 Client IDs" para Android/iOS o el "Web client" según tu flujo.
  // Reemplaza 'YOUR_GOOGLE_CLIENT_ID' por tu client id.
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_GOOGLE_CLIENT_ID_EXPO",      // para Expo Go / Android (si aplica)
    iosClientId: "YOUR_GOOGLE_IOS_CLIENT_ID",       // si usas iOS nativo
    androidClientId: "YOUR_GOOGLE_ANDROID_CLIENT_ID", // si usas Android nativo
    webClientId: "YOUR_GOOGLE_WEB_CLIENT_ID",       // para web (opcional)
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      // authentication contains accessToken and idToken (on some configs)
      // Preferimos enviar id_token al backend para validación en server.
      handleGoogleResponse(authentication);
    } else if (response?.type === "error") {
      ToastAndroid.show("Error en autenticación con Google", ToastAndroid.SHORT);
    }
  }, [response]);

  async function handleGoogleResponse(authentication) {
    // authentication may have accessToken; sometimes id_token is in response.params.id_token
    // we'll try to get id_token from response if present; otherwise send accessToken to server for exchange.
    setLoading(true);
    try {
      // Si tu response incluye id_token:
      const id_token = response?.params?.id_token || null;

      if (!id_token && !authentication?.accessToken) {
        ToastAndroid.show("No se obtuvo token de Google", ToastAndroid.LONG);
        setLoading(false);
        return;
      }

      // Envia al backend para verificar y obtener tu JWT propio
      // Backend: verificar id_token con Google y crear/obtener usuario -> devolver JWT
      const body = id_token ? { id_token } : { access_token: authentication.accessToken };

      const res = await axios.post(`http://${BASE_URL}/auth/google`, body, { timeout: 10000 });
      const token = res.data?.access_token || res.data?.token || null;

      if (!token) {
        ToastAndroid.show("Respuesta inválida del servidor", ToastAndroid.LONG);
        setLoading(false);
        return;
      }

      await saveToken(token);

      // Puedes también enviar información a /save-token si lo necesitas:
      // await sendTokenToBackend(res.data);

      ToastAndroid.show("¡Login con Google exitoso!", ToastAndroid.SHORT);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (e) {
      console.warn("google login error", e?.response?.data || e.message);
      ToastAndroid.show("Error autenticando con Google o con el servidor", ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }

  async function onLogin() {
    if (!usuario || !contrasena) {
      ToastAndroid.show("Completa ambos campos", ToastAndroid.SHORT);
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
        ToastAndroid.show("Respuesta inválida del servidor", ToastAndroid.LONG);
        setLoading(false);
        return;
      }
      await saveToken(token);

      // enviar token al backend si lo necesitas:
      // await sendTokenToBackend(res.data);

      ToastAndroid.show(`¡Bienvenido!`, ToastAndroid.SHORT);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (e) {
      console.warn(e);
      ToastAndroid.show("Credenciales inválidas o error de conexión", ToastAndroid.LONG);
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
          // útil mostrar el promptAsync para abrir el flujo de Google
          promptAsync();
        }}
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
