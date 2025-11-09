// screens/SplashScreen.js
import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { getToken, clearToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        // Espera 3s (simula carga) mientras comprobamos token
        const wait = new Promise(res => setTimeout(res, 3000));
        const tokenPromise = getToken(); // lee token si existe
        const [token] = await Promise.all([tokenPromise, wait]);

        if (!mounted) return;
        
        if (token) {
          // Validar el token con el backend
          const response = await fetch(`http://${BASE_URL}/validate-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            // Token válido, ir al stack principal
            navigation.reset({
              index: 0,
              routes: [{ name: "Main" }],
            });
          } else {
            // Token inválido, limpiar y ir a login
            await clearToken();
            navigation.reset({
              index: 0,
              routes: [{ name: "Auth" }],
            });
          }
        } else {
          // No hay token, ir a login
          navigation.reset({
            index: 0,
            routes: [{ name: "Auth" }],
          });
        }
      } catch (error) {
        console.error('Error en validación:', error);
        // En caso de error, ir a login
        await clearToken();
        navigation.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        });
      }
    }

    check();
    return () => { mounted = false; };
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Reemplaza con tu logo en assets */}
      <Image source={require("../assets/logo.jpeg")} style={styles.logo} />
      <Text style={styles.title}>GreenShop</Text>
      <ActivityIndicator style={{ marginTop: 16 }} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#fff" },
  logo: { width:140, height:140, resizeMode:"contain" },
  title: { marginTop:12, fontSize:18, fontWeight:"700", color:"#2E7D32" }
});
