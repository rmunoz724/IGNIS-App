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
    .then(() => console.log('Conectado a la BD (MongoDB Atlas)'))
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
    message: "Demasiadas peticiones."
});
app.use('/api/', apiLimiter);

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

// --- ENDPOINT DEL CHATBOT CON IA (GROQ - 100% GRATIS) ---
app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;
        const apiKey = process.env.GROQ_API_KEY;
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const payload = {
            model: "llama3-8b-8192", // Modelo ultra rápido, gratis y estable
            messages: [
                { 
                    role: "system", 
                    content: "Eres I.G.N.I.S. IA, un asistente experto en gestión de incendios forestales y emergencias en Chile. Tu objetivo es dar instrucciones de evacuación, primeros auxilios y mantener la calma. Responde de forma MUY breve y directa, máximo 2 o 3 oraciones. Si te preguntan cosas no relacionadas a emergencias, responde que solo puedes ayudar en casos de emergencia." 
                },
                { 
                    role: "user", 
                    content: mensaje 
                }
            ],
            temperature: 0.3
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error de Groq:", data);
            return res.status(500).json({ respuesta: 'Error conectando con los servidores de emergencia.' });
        }

        const respuestaIA = data.choices[0].message.content;
        res.status(200).json({ respuesta: respuestaIA });
    } catch (error) {
        console.error("Error en el servidor al consultar IA:", error);
        res.status(500).json({ respuesta: 'No me pude conectar a los servidores. Intenta de nuevo.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor I.G.N.I.S. corriendo seguro en el puerto ${PORT}`);
});