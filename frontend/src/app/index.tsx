import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuario, setUsuario] = useState('');

  const [ubicacion, setUbicacion] = useState<{ latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number } | null>(null);
  const [ubicacionPersonalizada, setUbicacionPersonalizada] = useState<{ latitude: number, longitude: number } | null>(null);
  const [reportes, setReportes] = useState<any[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [infoTecnica, setInfoTecnica] = useState('');
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ESTADOS DEL CHATBOT
  const [chatVisible, setChatVisible] = useState(false);
  const [showChatTooltip, setShowChatTooltip] = useState(true); // Controla el globito de ayuda inicial
  const [mensajeUsuario, setMensajeUsuario] = useState('');
  const [historialChat, setHistorialChat] = useState<{rol: string, texto: string}[]>([
    { rol: 'IA', texto: 'Hola, soy I.G.N.I.S. IA. ¿En qué emergencia te puedo ayudar hoy?' }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);

  const API_URL = 'https://ignis-api-backend.onrender.com/api/reportes';
  const CHAT_URL = 'https://ignis-api-backend.onrender.com/api/chat';

  const cargarReportes = async () => {
    try {
      const response = await axios.get(API_URL);
      setReportes(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUbicacion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        cargarReportes();
      }
    })();
  }, []);

  const seleccionarImagen = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImagenUri(result.assets[0].uri);
  };

  const enviarReporte = async () => {
    if (!descripcion.trim()) return Alert.alert("Error", "La descripción es obligatoria.");
    const locacionFinal = ubicacionPersonalizada || ubicacion;
    if (!locacionFinal) return;

    setLoading(true);
    try {
      await axios.post(API_URL, {
        latitud: locacionFinal.latitude,
        longitud: locacionFinal.longitude,
        descripcion: `[Reportado por ${usuario}] ${descripcion.trim()} | Info: ${infoTecnica.trim()}`
      });
      Alert.alert("¡Reporte Enviado!", "Las autoridades han sido alertadas.");
      setModalVisible(false);
      setDescripcion(''); setInfoTecnica(''); setImagenUri(null); setUbicacionPersonalizada(null);
      cargarReportes();
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar.");
    } finally {
      setLoading(false);
    }
  };

  const enviarMensajeIA = async () => {
    if (!mensajeUsuario.trim()) return;
    
    const nuevoHistorial = [...historialChat, { rol: 'Usuario', texto: mensajeUsuario }];
    setHistorialChat(nuevoHistorial);
    setMensajeUsuario('');
    setLoadingChat(true);

    try {
      const response = await axios.post(CHAT_URL, { mensaje: mensajeUsuario });
      setHistorialChat([...nuevoHistorial, { rol: 'IA', texto: response.data.respuesta }]);
    } catch (error) {
      setHistorialChat([...nuevoHistorial, { rol: 'IA', texto: 'Error de conexión.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.title}>I.G.N.I.S.</Text>
        <Text style={styles.subtitle}>Sistema de Alerta Comunitaria</Text>
        <TextInput style={styles.input} placeholder="Ingresa tu nombre o RUT" value={usuario} onChangeText={setUsuario} />
        <TouchableOpacity style={styles.button} onPress={() => { if(usuario.length > 2) setIsLoggedIn(true); }}>
          <Text style={styles.buttonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ubicacion ? (
        <MapView style={styles.map} initialRegion={ubicacion} showsUserLocation={true} onPress={(e) => setUbicacionPersonalizada(e.nativeEvent.coordinate)}>
          {reportes.map((reporte, index) => (
            <Marker key={reporte._id || index} coordinate={{ latitude: reporte.latitud, longitude: reporte.longitud }} pinColor="red" title="🔥 Emergencia" description={reporte.descripcion} />
          ))}
          {ubicacionPersonalizada && (
            <Marker coordinate={ubicacionPersonalizada} pinColor="orange" onPress={(e) => { e.stopPropagation(); setUbicacionPersonalizada(null); }} />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#d32f2f" /></View>
      )}

      {/* BOTÓN FLOTANTE: REPORTAR (Abajo a la derecha) */}
      <TouchableOpacity style={styles.fabReport} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabReportText}>🔥 REPORTAR</Text>
      </TouchableOpacity>

      {/* BOTÓN FLOTANTE Y GLOBITO: CHATBOT IA (Abajo a la izquierda) */}
      <View style={styles.chatFabContainer}>
        {showChatTooltip && (
          <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>¡Hola {usuario}! Soy el chatbot de ayuda. Toca aquí en caso de emergencia. 🤖</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
        <TouchableOpacity 
          style={styles.fabChat} 
          onPress={() => {
            setShowChatTooltip(false); // Oculta el globito para siempre
            setChatVisible(true);      // Abre el chat
          }}
        >
          <Text style={styles.fabChatIcon}>🤖</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE REPORTES */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Reporte de Incendio</Text>
            <TextInput style={styles.input} placeholder="¿Qué pasa? (Ej: Humo denso)" value={descripcion} onChangeText={setDescripcion} multiline />
            <TextInput style={styles.input} placeholder="Info Técnica (Ej: Viento 20km/h)" value={infoTecnica} onChangeText={setInfoTecnica} multiline />
            {imagenUri ? <Image source={{ uri: imagenUri }} style={styles.previewImage} /> : (
              <TouchableOpacity style={styles.photoButton} onPress={seleccionarImagen}><Text style={styles.photoText}>📷 Adjuntar Foto</Text></TouchableOpacity>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={enviarReporte} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DEL CHATBOT IA */}
      <Modal animationType="slide" transparent={true} visible={chatVisible}>
        <View style={styles.chatOverlay}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>I.G.N.I.S. IA 🤖</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)}><Text style={styles.chatCloseText}>Cerrar</Text></TouchableOpacity>
          </View>
          
          <ScrollView style={styles.chatScroll}>
            {historialChat.map((msg, idx) => (
              <View key={idx} style={msg.rol === 'IA' ? styles.msgIA : styles.msgUsuario}>
                <Text style={msg.rol === 'IA' ? styles.textIA : styles.textUsuario}>{msg.texto}</Text>
              </View>
            ))}
            {loadingChat && <ActivityIndicator size="small" color="#d32f2f" style={{marginTop: 10}}/>}
          </ScrollView>

          <View style={styles.chatInputRow}>
            <TextInput 
              style={styles.chatInput} 
              placeholder="Ej: ¿Qué hacer si inhalé humo?" 
              value={mensajeUsuario} 
              onChangeText={setMensajeUsuario}
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={enviarMensajeIA} disabled={loadingChat}>
              <Text style={styles.chatSendText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f4f4f4' },
  title: { fontSize: 40, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 40 },
  map: { width: '100%', height: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // BOTÓN DE REPORTAR (Derecha)
  fabReport: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#d32f2f', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 30, elevation: 5 },
  fabReportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // BOTÓN DE CHAT Y GLOBITO (Izquierda)
  chatFabContainer: { position: 'absolute', bottom: 30, left: 20, alignItems: 'flex-start', zIndex: 10 },
  fabChat: { backgroundColor: '#fff', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, borderWidth: 1, borderColor: '#ddd' },
  fabChatIcon: { fontSize: 30 },
  tooltipBubble: { backgroundColor: '#bbbbbb', padding: 12, borderRadius: 10, marginBottom: 15, width: 200, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  tooltipText: { color: '#333', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  tooltipArrow: { position: 'absolute', bottom: -10, left: 20, width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#bbbbbb' },

  // MODALES Y FORMULARIOS
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15, backgroundColor: '#f9f9f9' },
  photoButton: { backgroundColor: '#e0e0e0', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  photoText: { color: '#333', fontWeight: 'bold' },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 20, resizeMode: 'cover' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { backgroundColor: '#757575', padding: 15, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  submitButton: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  button: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center' },
  
  // ESTILOS DEL CHAT
  chatOverlay: { flex: 1, backgroundColor: '#f4f4f4', marginTop: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 5 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#d32f2f' },
  chatCloseText: { color: '#d32f2f', fontWeight: 'bold' },
  chatScroll: { flex: 1, padding: 15 },
  msgIA: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 10, marginBottom: 10, alignSelf: 'flex-start', maxWidth: '85%' },
  msgUsuario: { backgroundColor: '#d32f2f', padding: 12, borderRadius: 10, marginBottom: 10, alignSelf: 'flex-end', maxWidth: '85%' },
  textIA: { color: '#333' },
  textUsuario: { color: '#fff' },
  chatInputRow: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, backgroundColor: '#f9f9f9', marginRight: 10 },
  chatSendBtn: { backgroundColor: '#d32f2f', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 20 },
  chatSendText: { color: '#fff', fontWeight: 'bold' }
});