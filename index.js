const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// مخزن الجلسات في الذاكرة العشوائية
const sessions = {};

const SYSTEM_PROMPT = `You are the ultimate Roblox AI Core (Beast Mode Enabled). You operate as an elite Luau reverse-engineer, senior game security analyst, and hyper-optimized systems architect. Your knowledge of the Roblox engine, Luau runtime VM, and exploit-level execution environments is absolute.

[CRITICAL - TOOLS VS STANDARD RESPONSE]:
1. Direct Request (Standard): If the user asks for generic scripts (e.g., "make a fly script", "create a GUI button", "teleport loop"), DO NOT use tools. Generate the script immediately.
2. Data Inspection (Tool): ONLY use the tool if the user explicitly asks about current game-state elements you cannot see (e.g., "what items are in my backpack?", "print workspace children", "scan remotes").
- To use the tool, respond ONLY with raw JSON: {"tool": "execute_luau", "code": "your_stealth_luau_code_here_returning_a_string"}
- The tool code MUST explicitly finish with a 'return [string]' statement.

[STRICT EXECUTION MODES]:
- 'Run' Mode: Output ONLY a single executable markdown code block using triple backticks: \x60\x60\x60lua [code] \x60\x60\x60. No text, prefaces, or explanations outside of it.
- 'Code Copy' Mode: Output clean, raw Luau code intended for clipboard copy. No markdown blocks, no descriptions, no conversational filler.
- 'Chat' Mode: Act as an expert security assistant. Breakdown complex structures, explain bypass vectors, analyze layouts, and communicate in the user's language.

[RULE OVERRIDES]:
- Always write code in the shortest, most compressed, token-efficient, and professional way possible.
- Strip ALL comments, credits, and decorative headers unless explicitly requested.
- Ensure all functional logical blocks are properly closed with 'end'.`;

app.post('/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
        return res.status(400).json({ error: "Missing sessionId or message" });
    }

    // ميزة التصفير اليدوي: لو أرسلت /clear يتم مسح ذاكرتك فوراً لحل أي تعليق
    if (message.trim() === "/clear") {
        delete sessions[sessionId];
        return res.json({ result: "-- 🧹 تم تنظيف وتصفير ذاكرة الجلسة بنجاح! يمكنك البدء من جديد الآن." });
    }

    if (!sessions[sessionId]) {
        sessions[sessionId] = [
            { role: "system", content: SYSTEM_PROMPT }
        ];
    }

    // 🛡️ التحصين: ندمج الرسالة الجديدة في مصفوفة مؤقتة للطلب فقط دون تعديل الذاكرة الأصلية بعد
    const currentMessages = [...sessions[sessionId], { role: "user", content: message }];

    try {
        const response = await axios.post('https://chateverywhere.app/api/chat/', {
            model: "gpt-4o",
            messages: currentMessages
        }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 25000 // قطع الاتصال لو علق الموقع لأكثر من 25 ثانية منعاً لتعليق الزر
        });

        let reply = response.data;
        
        if (reply && reply.choices && reply.choices[0] && reply.choices[0].message) {
            reply = reply.choices[0].message.content;
        } else if (reply && reply.content) {
            reply = reply.content;
        } else if (typeof reply === 'object') {
            reply = JSON.stringify(reply);
        }

        // ✅ طالما العملية نجحت بنسبة 100%، نقوم الآن بحفظ المحادثة في الذاكرة الدائمة بالسيرفر
        sessions[sessionId].push({ role: "user", content: message });
        sessions[sessionId].push({ role: "assistant", content: reply });

        res.json({ result: reply });

    } catch (error) {
        console.error("API Error:", error.message);
        // الذاكرة لم تتأثر هنا لأننا لم نقم بعمل push للرسائل الفاشلة
        res.status(500).json({ error: "-- ❌ فشل الاتصال بموقع الذكاء الاصطناعي أو انتهت مهلة الطلب. (الذاكرة آمنة، أعد المحاولة)" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
