// screens/SplashScreen.js
import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { getToken } from "../utils/TokenStore";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let mounted = true;

    async function check() {
      // Espera 3s (simula carga) mientras comprobamos token
      const wait = new Promise(res => setTimeout(res, 3000));
      const tokenPromise = getToken(); // lee token si existe
      const [token] = await Promise.all([tokenPromise, wait]);

      if (!mounted) return;
      if (token) {
        // si hay token, vamos al stack principal (Home). Usamos reset para limpiar historial.
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      } else {
        // si no hay token, vamos a Auth (login)
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
