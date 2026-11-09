const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Importamos la librería de IA
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();

const app = express();

// Inicializamos Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// ENDPOINT DEL CHATBOT CON IA
app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;
        
        // Configuramos el modelo y el "System Prompt" (las reglas del bot)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro",
            systemInstruction: "Eres I.G.N.I.S. IA, un asistente experto en gestión de incendios forestales y emergencias en Chile. Tu objetivo es dar instrucciones de evacuación, primeros auxilios y mantener la calma. Responde de forma MUY breve y directa, máximo 2 o 3 oraciones. Si te preguntan cosas no relacionadas a emergencias, responde que solo puedes ayudar en casos de emergencia."
        });

        const result = await model.generateContent(mensaje);
        const response = await result.response;
        
        res.status(200).json({ respuesta: response.text() });
    } catch (error) {
        console.error("Error en la IA:", error);
        res.status(500).json({ respuesta: 'No me pude conectar a los servidores de emergencia. Intenta de nuevo.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor I.G.N.I.S. corriendo seguro en el puerto ${PORT}`);
});
