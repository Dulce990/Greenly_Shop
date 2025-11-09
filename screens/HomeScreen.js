// screens/HomeScreen.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import axios from "axios";
import { getToken } from "../utils/TokenStore";
import BASE_URL from "../utils/const";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;
const CHART_COLORS = ["#66BB6A", "#43A047", "#9CCC65", "#B2FF59", "#FFF176", "#FFB74D"];

// ----- Small components -----
function InfoCard({ title, value }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ProductSmallCardWithImage({ product, onPress }) {
  const imageUrl = product.imageUrl || product.image_url || null;
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productPlaceholder]} />
      )}
      <Text style={styles.productName} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.productCategory}>{product.category}</Text>
    </TouchableOpacity>
  );
}

// ----- Chart wrappers -----
function PieChartCard({ dataMap }) {
  const pairs = useMemo(() => {
    const arr = Object.entries(dataMap);
    if (!arr.length) return [];
    const sorted = arr.sort((a, b) => b[1] - a[1]);
    if (sorted.length <= 6) return sorted;
    const top = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((s, p) => s + p[1], 0);
    return [...top, ["Otros", others]];
  }, [dataMap]);

  if (!pairs.length) {
    return <Text style={{ color: "#666" }}>Sin datos</Text>;
  }

  const total = pairs.reduce((s, p) => s + p[1], 0) || 1;
  const chartData = pairs.map((p, i) => ({
    name: p[0],
    population: Number(p[1]),
    color: CHART_COLORS[i % CHART_COLORS.length],
    legendFontColor: "#333",
    legendFontSize: 12,
  }));

  return (
    <View>
      <PieChart
        data={chartData}
        width={screenWidth - 48}
        height={180}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="16"
        absolute
      />
      {pairs.map((p, i) => {
        const percent = (p[1] / total) * 100;
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginVertical: 2 }}>
            <View style={{ width: 12, height: 12, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 8 }} />
            <Text style={{ fontSize: 12 }}>
              {p[0]}: {Number(p[1]).toFixed(1)} ({percent.toFixed(1)}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BarChartCard({ dataMap, height = 180 }) {
  const pairs = useMemo(() => Object.entries(dataMap).slice(0, 6), [dataMap]);
  if (!pairs.length) return <Text style={{ color: "#666" }}>Sin datos</Text>;

  const labels = pairs.map((p) => (p[0].length > 10 ? p[0].slice(0, 10) + "…" : p[0]));
  const values = pairs.map((p) => Number(p[1]));

  const chartData = {
    labels,
    datasets: [{ data: values }],
  };

  return (
    <BarChart
      data={chartData}
      width={screenWidth - 48}
      height={height}
      yAxisLabel=""
      chartConfig={{
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(34,139,34, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
        style: { borderRadius: 8 },
        propsForBackgroundLines: { strokeDasharray: "" },
      }}
      verticalLabelRotation={20}
      fromZero
      showValuesOnTopOfBars
    />
  );
}

// ----- HomeScreen -----
export default function HomeScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [interactions, setInteractions] = useState([]); // product ids
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [prodRes, purchasesRes, interRes] = await Promise.allSettled([
        axios.get(`http://${BASE_URL}/products/get`, { headers }),
        axios.get(`http://${BASE_URL}/purchases/me`, { headers }),
        axios.get(`http://${BASE_URL}/interacciones`, { headers }),
      ]);

      if (prodRes.status === "fulfilled" && Array.isArray(prodRes.value.data)) {
        const arr = prodRes.value.data.map((o) => ({
          id: o.id,
          name: o.name || "",
          category: o.category || "Sin categoría",
          carbon: Number(o.carbon_footprint || o.carbon || 0),
          price: Number(o.price || 0),
          imageUrl: o.image_url || o.profile_picture || null,
        }));
        setProducts(arr);
      } else {
        setProducts([]);
      }

      if (purchasesRes.status === "fulfilled" && Array.isArray(purchasesRes.value.data)) {
        const arr = purchasesRes.value.data.map((o) => ({
          id: o.id,
          productId: o.product_id,
          quantity: o.quantity || 1,
          totalPrice: Number(o.total_price || o.total || 0),
          createdAt: o.created_at || o.createdAt || "",
        }));
        setPurchases(arr);
      } else {
        setPurchases([]);
      }

      if (interRes.status === "fulfilled" && Array.isArray(interRes.value.data)) {
        const arr = interRes.value.data.map((o) => o.product_id).filter(Boolean);
        setInteractions(arr);
      } else {
        setInteractions([]);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn("fetchAll error:", e.message || e);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchAll(), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const totalSpent = useMemo(() => purchases.reduce((s, p) => s + Number(p.totalPrice || 0), 0), [purchases]);

  const carbonByCategory = useMemo(() => {
    const map = {};
    const prodMap = {};
    products.forEach((p) => (prodMap[p.id] = p));
    purchases.forEach((pu) => {
      const prod = prodMap[pu.productId];
      if (!prod) return;
      const contrib = (Number(prod.carbon || 0) || 0) * Number(pu.quantity || 1);
      map[prod.category] = (map[prod.category] || 0) + contrib;
    });
    return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
  }, [products, purchases]);

  const spendByCategory = useMemo(() => {
    const map = {};
    const prodMap = {};
    products.forEach((p) => (prodMap[p.id] = p));
    purchases.forEach((pu) => {
      const prod = prodMap[pu.productId];
      const cat = prod?.category || "Sin categoría";
      map[cat] = (map[cat] || 0) + Number(pu.totalPrice || 0);
    });
    return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
  }, [products, purchases]);

  const interactionsByCategory = useMemo(() => {
    const map = {};
    const prodMap = {};
    products.forEach((p) => (prodMap[p.id] = p));
    interactions.forEach((pid) => {
      const prod = prodMap[pid];
      const cat = prod?.category || "Sin categoría";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
  }, [products, interactions]);

  const interactedProducts = useMemo(() => products.filter((p) => interactions.includes(p.id)), [products, interactions]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* TopBar: hamburger + title */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburgerBtn}>
          <Ionicons name="menu" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitleCentered}>Bienvenido a Greenly Shop</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoRow}>
        <InfoCard title="Gasto total" value={`$${totalSpent.toFixed(2)}`} />
        <InfoCard title="Huella total" value={`${Object.values(carbonByCategory).reduce((s, v) => s + v, 0).toFixed(2)} kg`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Huella por categoría</Text>
        <View style={{ marginTop: 8 }}>
          <PieChartCard dataMap={carbonByCategory} />
          <Text style={styles.smallGray}>Última actualización: {lastUpdated || "-"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gasto por categoría</Text>
        <View style={{ marginTop: 8 }}>
          <BarChartCard dataMap={spendByCategory} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Interacciones por categoría</Text>
        <View style={{ marginTop: 8 }}>
          <BarChartCard dataMap={interactionsByCategory} height={140} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Productos con interacción</Text>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : interactedProducts.length === 0 ? (
          <Text style={{ color: "#666", marginTop: 12 }}>Aún no has interactuado con productos</Text>
        ) : (
          <FlatList
            data={interactedProducts}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            renderItem={({ item }) => (
              <ProductSmallCardWithImage
                product={item}
                onPress={() => navigation.navigate("ProductDetail", { id: item.id })}
              />
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
  headerRow: { marginBottom: 12, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2E7D32" },
  subHeader: { color: "#666", fontSize: 12, marginTop: 6 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  infoCard: { width: (screenWidth - 48) / 2, height: 80, backgroundColor: "#F1F8EA", borderRadius: 10, padding: 12, justifyContent: "center" },
  infoTitle: { fontSize: 12, color: "#666" },
  infoValue: { fontWeight: "700", fontSize: 18, color: "#2E7D32" },
  card: { backgroundColor: "#F5F5F5", padding: 12, borderRadius: 10, marginVertical: 8 },
  cardTitle: { fontWeight: "700", marginBottom: 6 },
  smallGray: { color: "#666", fontSize: 12, marginTop: 6 },
  productCard: { width: 180, height: 220, backgroundColor: "#DDF0B4", borderRadius: 10, padding: 8, alignItems: "center" },
  productImage: { width: "100%", height: 120, borderRadius: 8, backgroundColor: "#ddd" },
  productPlaceholder: { justifyContent: "center", alignItems: "center" },
  productName: { marginTop: 8, fontWeight: "700", color: "#6BAA00", textAlign: "center" },
  productCategory: { fontSize: 12, color: "#666" },
});
