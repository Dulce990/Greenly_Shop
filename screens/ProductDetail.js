// screens/ProductDetail.js
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    ActivityIndicator,
    TextInput,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../utils/TokenStore';
import BASE_URL from '../utils/const';
import { Ionicons } from '@expo/vector-icons';

function getUserIdFromToken(token) {
    try {
        const payload64 = token.split('.')[1];
        const decodedData = payload64.replace(/-/g, '+').replace(/_/g, '/');
        const decodedString = decodeURIComponent(
            atob(decodedData)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const jsonPayload = JSON.parse(decodedString);
        return jsonPayload.user_id || jsonPayload.sub || null;
    } catch (e) {
        return null;
    }
}

export default function ProductDetail({ route, navigation }) {
    const { id } = route.params || {};
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [token, setToken] = useState(null);
    const [userId, setUserId] = useState(null);

    const loadAuth = async () => {
        const t = await getToken();
        setToken(t);
        if (t) setUserId(getUserIdFromToken(t));
    };

    const loadProduct = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const t = await getToken();
            const headers = t ? { Authorization: `Bearer ${t}` } : {};
            try {
                const res = await axios.get(`http://${BASE_URL}/products/${id}`, { headers, timeout: 10000 });
                setProduct(res.data);
            } catch (e) {
                const res = await axios.get(`http://${BASE_URL}/products/get`, { headers, timeout: 10000 });
                const found = Array.isArray(res.data) ? res.data.find((p) => Number(p.id) === Number(id)) : null;
                setProduct(found || null);
            }
        } catch (err) {
            console.warn('loadProduct error:', err?.message || err);
            setProduct(null);
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        try {
            const t = await getToken();
            const headers = t ? { Authorization: `Bearer ${t}` } : {};
            const res = await axios.get(`http://${BASE_URL}/comments/product/${id}`, { headers, timeout: 10000 });
            if (Array.isArray(res.data)) setComments(res.data);
            else setComments([]);
        } catch (e) {
            console.warn('loadComments error:', e?.message || e);
            setComments([]);
        }
    };

    useEffect(() => {
        loadAuth();
        loadProduct();
        loadComments();
        (async () => {
            try {
                const t = await getToken();
                if (!t) return;
                await axios.post(`http://${BASE_URL}/interacciones`, { product_id: id }, { headers: { Authorization: `Bearer ${t}` } });
            } catch (e) { /* ignore */ }
        })();
    }, [id]);

    const postComment = async () => {
        if (!token) return Alert.alert('No autorizado');
        if (!newComment.trim()) return;
        try {
            const res = await axios.post(`http://${BASE_URL}/comments/create`, { product_id: id, content: newComment.trim() }, { headers: { Authorization: `Bearer ${token}` } });
            setNewComment('');
            loadComments();
            Alert.alert('Comentario publicado');
        } catch (e) {
            console.warn('postComment error:', e?.response || e?.message || e);
            const msg = e?.response?.data?.detail || e?.message || 'Error';
            Alert.alert('Error', String(msg));
        }
    };

    const addToCart = async (productId, qty) => {
        if (!token) return Alert.alert('No autorizado');
        try {
            await axios.post(`http://${BASE_URL}/cart/add`, { product_id: productId, quantity: qty }, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('Producto agregado al carrito');
        } catch (e) {
            console.warn('addToCart error:', e?.response || e?.message || e);
            const msg = e?.response?.data?.detail || e?.message || 'Error';
            Alert.alert('Error', String(msg));
        }
    };

    const buyNow = async (productId, qty) => {
        if (!token) return Alert.alert('No autorizado');
        try {
            await axios.post(`http://${BASE_URL}/transactions/buy`, { product_id: productId, quantity: qty }, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('Compra realizada');
            setQuantity(1);
            loadProduct();
        } catch (e) {
            console.warn('buyNow error:', e?.response || e?.message || e);
            const msg = e?.response?.data?.detail || e?.message || 'Error';
            Alert.alert('Error', String(msg));
        }
    };

    const deleteComment = async (commentId) => {
        if (!token) return Alert.alert('No autorizado');
        try {
            await axios.delete(`http://${BASE_URL}/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
            loadComments();
            Alert.alert('Comentario eliminado');
        } catch (e) {
            console.warn('deleteComment error:', e?.response || e?.message || e);
            Alert.alert('Error al eliminar');
        }
    };

    // TopBar handlers: open drawer or go back (with fallback to 'Productos')
    const onPressMenu = () => {
        if (navigation?.openDrawer) navigation.openDrawer();
    };
    const onPressBack = () => {
        // intenta regresar naturalmente, si no hay historial, navega a la lista de productos del Drawer
        if (navigation.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // nombre del Drawer screen que contiene la lista de productos: "Productos"
            navigation.navigate('Productos');
        }
    };

    if (loading) return (
        <View style={styles.center}><ActivityIndicator size="large" color="#6BAA00" /></View>
    );

    if (!product) return (
        <View style={styles.center}><Text>No se encontró el producto</Text></View>
    );

    const isOwner = userId != null && Number(userId) === Number(product.created_by);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            {/* Top bar: back + title + menu */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onPressBack} style={styles.topBtn}>
                    <Ionicons name="arrow-back" size={22} color="#2E7D32" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Detalle del producto</Text>
                <TouchableOpacity onPress={onPressMenu} style={styles.topBtn}>
                    <Ionicons name="menu" size={24} color="#2E7D32" />
                </TouchableOpacity>
            </View>

            {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.image} />
            ) : (
                <View style={[styles.image, { backgroundColor: '#eee' }]} />
            )}

            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.bold}>Categoría:</Text>
            <Text style={styles.normal}>{product.category}</Text>

            <Text style={styles.bold}>Huella de carbono:</Text>
            <Text style={styles.normal}>{String(product.carbon_footprint || product.carbon || 0)}</Text>

            <Text style={styles.bold}>Precio:</Text>
            <Text style={styles.normal}>${Number(product.price || 0).toFixed(2)}</Text>

            <Text style={styles.bold}>Stock:</Text>
            <Text style={styles.normal}>{product.quantity}</Text>

            {!isOwner && (
                <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity onPress={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                        <Text style={{ marginHorizontal: 12 }}>{quantity}</Text>
                        <TouchableOpacity onPress={() => setQuantity(q => q + 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6BAA00' }]} onPress={() => buyNow(product.id, quantity)}>
                            <Text style={styles.actionText}>Comprar ahora</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#A6C800' }]} onPress={() => addToCart(product.id, quantity)}>
                            <Text style={styles.actionText}>Añadir al carrito</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: 12 }}>
                        <TextInput
                            value={newComment}
                            onChangeText={setNewComment}
                            placeholder="Escribe un comentario"
                            style={styles.input}
                            multiline
                        />
                        <TouchableOpacity

                            style={[styles.actionBtn, { alignSelf: 'flex-end', marginTop: 8,  backgroundColor: '#A6C800' }]}

                        onPress={postComment}>

                        <Text style={styles.actionText}>Enviar comentario</Text>

                    </TouchableOpacity>
                </View>
        </View>
    )
}

<View style={{ marginTop: 16 }}>
    <Text style={[styles.title, { fontSize: 16 }]}>Comentarios</Text>
    {comments.length === 0 ? (
        <Text style={{ color: '#666', marginTop: 8 }}>No hay comentarios</Text>
    ) : (
        comments.map((c) => (
            <View key={String(c.id)} style={styles.comment}>
                <Image source={{ uri: c.user?.profile_picture || 'https://res.cloudinary.com/dkerhtvlk/image/upload/v1753410801/fotoDefault_uegm43.jpg' }} style={styles.commentAvatar} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{c.user?.username || 'Usuario'}</Text>
                    <Text>{c.content}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>{String(c.created_at || '').slice(0, 10)}</Text>
                </View>
                {userId && Number(userId) === Number(c.user_id) && (
                    <TouchableOpacity onPress={() => {
                        Alert.alert('Eliminar', '¿Eliminar comentario?', [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => deleteComment(c.id) }
                        ]);
                    }}>
                        <Text style={{ color: 'red', marginLeft: 8 }}>Eliminar</Text>
                    </TouchableOpacity>
                )}
            </View>
        ))
    )}
</View>
    </ScrollView >
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    topBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#2E7D32' },
    image: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#ddd' },
    title: { fontSize: 20, fontWeight: '700', color: '#2E7D32', marginTop: 12 },
    bold: { marginTop: 10, fontWeight: '700', color: '#2E7D32' },
    normal: { marginTop: 4, marginBottom: 4 },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
    actionBtn: { flex: 1, padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6 },
    actionText: { color: '#fff', fontWeight: '700' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, minHeight: 60 },
    comment: { flexDirection: 'row', padding: 8, backgroundColor: '#F8FFF2', borderRadius: 8, marginTop: 8, alignItems: 'center' },
    commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, backgroundColor: '#ddd' },
});
