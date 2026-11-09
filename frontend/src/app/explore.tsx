import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil de Usuario</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.label}>Nombre registrado:</Text>
        <Text style={styles.value}>Prueba</Text>
      </View>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f4', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#d32f2f', marginBottom: 30, textAlign: 'center' },
  infoCard: { backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 30, elevation: 3 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  value: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  button: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});