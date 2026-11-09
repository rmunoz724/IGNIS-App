const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a la Base de Datos en la Nube (MongoDB Atlas)'))
    .catch(err => console.error('Error conectando a la BD:', err));

const reporteSchema = new mongoose.Schema({
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});
const Reporte = mongoose.model('Reporte', reporteSchema);

app.use(helmet());
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Demasiadas peticiones desde esta IP."
});
app.use('/api/', apiLimiter);

// ENDPOINTS DE REPORTES
app.get('/api/reportes', async (req, res) => {
    try {
        const listaReportes = await Reporte.find().sort({ fecha: -1 }).limit(50);
        res.status(200).json(listaReportes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno.' });
    }
});

app.post('/api/reportes', [
    body('latitud').isFloat({ min: -90, max: 90 }),
    body('longitud').isFloat({ min: -180, max: 180 }),
    body('descripcion').trim().escape().isLength({ max: 255 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const nuevoReporte = new Reporte(req.body);
        await nuevoReporte.save();
        res.status(201).json({ mensaje: '¡Reporte guardado!' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al guardar.' });
    }
});

// ENDPOINT DEL CHATBOT CON IA (Usando Fetch estándar)
app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        // URL directa a la API 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // El System Prompt y la estructura exacta que pide Google por HTTP
        const payload = {
            system_instruction: {
                parts: [{ text: "Eres I.G.N.I.S. IA, un asistente experto en gestión de incendios forestales y emergencias en Chile. Tu objetivo es dar instrucciones de evacuación, primeros auxilios y mantener la calma. Responde de forma MUY breve y directa, máximo 2 o 3 oraciones. Si te preguntan cosas no relacionadas a emergencias, responde que solo puedes ayudar en casos de emergencia." }]
            },
            contents: [{
                parts: [{ text: mensaje }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Validamos que Google haya enviado una respuesta correcta
        if (!response.ok) {
            console.error("Error de la API de Google:", data);
            return res.status(500).json({ respuesta: 'Error conectando con los servidores de emergencia.' });
        }

        // Extraemos el texto de la respuesta de la estructura JSON
        const respuestaIA = data.candidates[0].content.parts[0].text;
        
        res.status(200).json({ respuesta: respuestaIA });
    } catch (error) {
        console.error("Error en el servidor al consultar IA:", error);
        res.status(500).json({ respuesta: 'No me pude conectar a los servidores de emergencia. Intenta de nuevo.' });
    }
});