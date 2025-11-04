// utils/api.js
import axios from "axios";
import BASE_URL from "./const";

/**
 * sendTokenToBackend: envía al backend datos recibidos tras login (opcional).
 * body puede ser un objeto (ej: { id_token } o { access_token } o el JSON completo del login).
 * Ajusta la ruta '/save-token' por la que use tu API (p. ej. '/auth/google' o '/save-token').
 */
export async function sendTokenToBackend(body) {
  try {
    const res = await axios.post(`http://${BASE_URL}/save-token`, body, { timeout: 10000 });
    return res.data;
  } catch (e) {
    // lanza el error para que el llamador lo maneje; además logueamos para debug
    console.warn("sendTokenToBackend error:", e?.response?.data || e.message);
    throw e;
  }
}
