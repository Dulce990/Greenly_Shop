// screens/ProductsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../utils/TokenStore';
import BASE_URL from '../utils/const';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function ProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`http://${BASE_URL}/products/get`, { headers, timeout: 10000 });
      if (Array.isArray(res.data)) {
        const arr = res.data.map((o) => ({
          id: o.id,
          name: o.name || '',
          category: o.category || 'Sin categoría',
          carbon: Number(o.carbon_footprint || o.carbon || 0),
          price: Number(o.price || 0),
          quantity: Number(o.quantity || 0),
          image_url: o.image_url || o.imageUrl || o.profile_picture || null,
        }));
        setProducts(arr);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.warn('fetchProducts error:', e?.message || e);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // refresh when screen focused
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      // <-- NAVIGATE TO ProductDetail INSIDE Home STACK
      onPress={() => navigation.navigate('Home', { screen: 'ProductDetail', params: { id: item.id } })}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, { backgroundColor: '#eee' }]} />
      )}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.category}>{item.category}</Text>
    </TouchableOpacity>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6BAA00" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburgerBtn}>
          <Ionicons name="menu" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitleCentered}>Productos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddProduct')} style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#2E7D32', fontWeight: '700' }}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={styles.center}><Text style={{ color: '#666' }}>No hay productos</Text></View>
        )}
      />
    </View>
  );
}

const cardWidth = (screenWidth - 8 * 3) / 2; // padding and gap

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 8 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  headerTitleCentered: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: cardWidth,
    marginBottom: 12,
    backgroundColor: '#DDF0B4',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  image: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#ddd' },
  name: { marginTop: 8, fontWeight: '700', color: '#6BAA00', textAlign: 'center' },
  category: { fontSize: 12, color: '#666' },
});
