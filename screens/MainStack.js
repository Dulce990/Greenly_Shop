// screens/MainStack.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./HomeScreen";
import ProductDetail from "./ProductDetail"; // crea o ajusta
import AddProduct from "./AddProduct";       // crea o ajusta
import CartScreen from "./CartScreen";       // crea o ajusta
// Si no tienes alguno, reemplaza las importaciones por un componente placeholder temporal.

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      <Stack.Screen name="AddProduct" component={AddProduct} />
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  );
}
