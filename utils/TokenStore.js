// utils/TokenStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";

export async function saveToken(token) {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log("[TokenStore] token saved");
    return true;
  } catch (e) {
    console.warn("saveToken error", e);
    return false;
  }
}

export async function getToken() {
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    return t;
  } catch (e) {
    console.warn("getToken error", e);
    return null;
  }
}

export async function clearToken() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    console.log("[TokenStore] token cleared");
  } catch (e) {
    console.warn("clearToken error", e);
  }
}

/**
 * Decodifica el payload de un JWT sin dependencias externas.
 * Devuelve el objeto payload o null si falla.
 */
function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== "string") return null;

    // Quitar prefijo "Bearer " si existe
    if (token.toLowerCase().startsWith("bearer ")) token = token.slice(7);

    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64 = parts[1];

    // Base64 URL-safe -> standard
    let base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    // añadir padding si hace falta
    while (base64.length % 4) base64 += "=";

    // decode bytes
    let jsonPayload;
    // Si atob está disponible (web / algunos entornos RN)
    if (typeof atob === "function") {
      const decoded = atob(base64);
      // convertir a string UTF-8
      jsonPayload = decodeURIComponent(
        decoded
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
    } else {
      // fallback Node/React Native: usar Buffer si está disponible
      try {
        // Buffer podría no existir en algunos entornos; atrapamos error
        const buf = Buffer.from(base64, "base64");
        jsonPayload = buf.toString("utf8");
      } catch (e) {
        console.warn("[TokenStore] No está disponible atob ni Buffer para decodificar JWT.");
        return null;
      }
    }

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn("[TokenStore] decodeJwtPayload error:", e?.message || e);
    return null;
  }
}

/**
 * Devuelve user_id del token si existe.
 * Acepta tokenArg (opcional) o lee AsyncStorage.
 */
export async function getCurrentUserId(tokenArg = null) {
  try {
    let token = tokenArg ?? (await getToken());
    if (!token) {
      console.warn("[TokenStore] getCurrentUserId: no token");
      return null;
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
      console.warn("[TokenStore] no se pudo decodificar payload del token");
      return null;
    }

    // Ajusta según tu payload real; tu ejemplo usa user_id
    const uid = payload?.user_id ?? payload?.userId ?? payload?.sub ?? payload?.user_id ?? payload?.logged_user ?? null;

    console.log("[TokenStore] token payload:", payload, " -> user id:", uid);
    return uid ?? null;
  } catch (e) {
    console.warn("getCurrentUserId error", e);
    return null;
  }
}
