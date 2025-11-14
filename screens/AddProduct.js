// screens/AddProductScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import { getToken, getCurrentUserId } from '../utils/TokenStore';
import { BASE_URL } from '../utils/const';
import { Ionicons } from '@expo/vector-icons';

// Colores personalizados
const verdeOscuro = '#6BAA00';
const verdeClaro = '#DDF0B4';
const verdeBoton = '#A6C800';

// Lista de Categorías
const CATEGORIES = [
  { label: 'Alimentos', value: 'Alimentos' },
  { label: 'Ropa', value: 'Ropa' },
  { label: 'Tecnologia', value: 'Tecnologia' },
  { label: 'Limpieza', value: 'Limpieza' },
  { label: 'Hogar', value: 'Hogar' },
  { label: 'Salud', value: 'Salud' },
  { label: 'Papeleria', value: 'Papeleria' },
  { label: 'Otro', value: 'Otro' },
];

export default function AddProductScreen() {
  const navigation = useNavigation();

  // header: botón hamburguesa
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Agregar producto",
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ paddingLeft: 12 }}>
          <Ionicons name="menu" size={26} color="#2E7D32" />
        </TouchableOpacity>
      ),
      headerStyle: { backgroundColor: '#fff' },
    });
  }, [navigation]);

  // --- Estados del Formulario ---
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(null);
  const [priceText, setPriceText] = useState('');
  const [quantityText, setQuantityText] = useState('');
  const [carbonFootprintText, setCarbonFootprintText] = useState('');
  const [recyclable, setRecyclable] = useState(false);
  const [local, setLocal] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar token al iniciar
  useEffect(() => {
    const loadToken = async () => {
      const t = await getToken();
      setToken(t);
      if (!t) {
        Alert.alert("Error", "No estás autorizado. Inicia sesión.");
        navigation.goBack();
      }
    };
    loadToken();
  }, []);

  const selectImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas dar permiso para acceder a la galería.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!token) return Alert.alert("Error", "No autorizado.");
    if (!name || !category || !priceText || !quantityText || !carbonFootprintText || !imageUri) {
      return Alert.alert("Error", "Completa todos los campos y selecciona una imagen.");
    }

    const price = parseFloat(priceText.replace(',', '.'));
    const quantity = parseInt(quantityText);
    const carbon = parseFloat(carbonFootprintText.replace(',', '.'));
    if (!(price > 0)) return Alert.alert("Error", "Precio inválido.");
    if (!(quantity > 0)) return Alert.alert("Error", "Cantidad inválida.");
    if (!(carbon >= 0)) return Alert.alert("Error", "Huella de carbono inválida.");

    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', String(price));
    formData.append('quantity', String(quantity));
    formData.append('carbon_footprint', String(carbon));
    formData.append('recyclable_packaging', String(recyclable));
    formData.append('local_origin', String(local));
    formData.append('status', 'disponible');

    let filename = imageUri.split('/').pop();
    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('image', {
      uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
      name: filename,
      type,
    });

    try {
      const response = await fetch(`http://${BASE_URL}/products/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok) {
        Alert.alert('Éxito', 'Producto guardado correctamente.');
        // Navegar a MyProducts (intenta dentro del stack y también por si el drawer es la raíz)
        navigation.navigate('MyProducts'); // si está en el mismo stack esto funciona
        navigation.getParent?.()?.navigate?.('MyProducts'); // fallback si es necesario
      } else {
        console.error('Respuesta de error de la API:', responseText);
        Alert.alert('Error', `Error al guardar producto: ${response.status} - ${responseText}`);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', 'Error de red al intentar guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Agregar Producto</Text>

      <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} />

      <View style={styles.inputPickerContainer}>
        <RNPickerSelect
          onValueChange={(value) => setCategory(value)}
          items={CATEGORIES}
          value={category}
          style={pickerSelectStyles}
          placeholder={{ label: "Selecciona una Categoría...", value: null }}
        />
      </View>

      <TextInput style={styles.input} placeholder="Precio (ej. 29.99)" value={priceText} onChangeText={setPriceText} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Cantidad (ej. 5)" value={quantityText} onChangeText={setQuantityText} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Huella de carbono (ej. 12.5)" value={carbonFootprintText} onChangeText={setCarbonFootprintText} keyboardType="numeric" />

      <View style={styles.switchRow}>
        <Text>Empaque reciclable</Text>
        <Switch trackColor={{ false: '#767577', true: verdeBoton }} thumbColor={recyclable ? verdeOscuro : '#f4f3f4'} value={recyclable} onValueChange={setRecyclable} />
      </View>

      <View style={styles.switchRow}>
        <Text>Origen local</Text>
        <Switch trackColor={{ false: '#767577', true: verdeBoton }} thumbColor={local ? verdeOscuro : '#f4f3f4'} value={local} onValueChange={setLocal} />
      </View>

      <TouchableOpacity style={styles.imageButton} onPress={selectImage} disabled={loading}>
        <Text style={styles.imageButtonText}>Seleccionar imagen</Text>
      </TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />}

      <TouchableOpacity style={[styles.saveButton, loading && styles.disabledButton]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  contentContainer: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: verdeOscuro, marginBottom: 20 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  inputPickerContainer: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12 },
  switchRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5, marginBottom: 8 },
  imageButton: { backgroundColor: verdeClaro, padding: 12, borderRadius: 8, marginTop: 10, marginBottom: 10, width: '100%', alignItems: 'center' },
  imageButtonText: { color: 'black', fontWeight: '600' },
  imagePreview: { width: 150, height: 150, borderRadius: 8, marginBottom: 20, backgroundColor: '#eee' },
  saveButton: { backgroundColor: verdeBoton, padding: 15, borderRadius: 8, width: '100%', height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveButtonText: { color: 'black', fontWeight: 'bold', fontSize: 18 },
  disabledButton: { opacity: 0.7 },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, color: 'black', paddingRight: 30 },
  inputAndroid: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8, color: 'black', paddingRight: 30 },
});
