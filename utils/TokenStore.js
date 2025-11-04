import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 Archivo que gestiona el almacenamiento del token de autenticación
 en el almacenamiento local del dispositivo usando AsyncStorage.
 */
const TOKEN_KEY = "auth_token";

// Guarda el token de autenticación
export async function saveToken(token) {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch (e) {
    console.warn("saveToken error", e);
    return false;
  }
}

// Recupera el token de autenticación
export async function getToken() {
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    return t;
  } catch (e) {
    console.warn("getToken error", e);
    return null;
  }
}

// Elimina el token de autenticación
export async function clearToken() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn("clearToken error", e);
  }
}
