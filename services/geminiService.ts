

import { GoogleGenAI, Type } from "@google/genai";
import type { Correction } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Added propertyOrdering to the response schema for more consistent JSON output from the model.
const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            original: {
                type: Type.STRING,
                description: 'คำหรือวลีที่สะกดผิด',
            },
            correction: {
                type: Type.STRING,
                description: 'คำหรือวลีที่แก้ไขให้ถูกต้อง',
            },
            explanation: {
                type: Type.STRING,
                description: 'คำอธิบายสั้นๆ เกี่ยวกับข้อผิดพลาด',
            },
        },
        required: ["original", "correction", "explanation"],
        propertyOrdering: ["original", "correction", "explanation"],
    },
};

// FIX: Refactored to use systemInstruction to separate instructions from user input, following Gemini API best practices.
export async function checkThaiSpelling(text: string, temperature: number): Promise<Correction[]> {
    const systemInstruction = `คุณคือผู้เชี่ยวชาญด้านภาษาไทยที่มีความแม่นยำสูง หน้าที่ของคุณคือตรวจสอบข้อความภาษาไทยเพื่อหาข้อผิดพลาดในการสะกดคำอย่างละเอียดเท่านั้น สำหรับแต่ละคำที่สะกดผิดที่พบ โปรดระบุคำที่ผิด (original) คำที่แก้ไขให้ถูกต้อง (correction) และคำอธิบายสั้นๆ เกี่ยวกับข้อผิดพลาดนั้น (explanation) หากไม่พบคำที่สะกดผิดใดๆ ให้ส่งคืนอาร์เรย์ว่าง

ข้อควรจำ: คำ ชื่อเฉพาะ และคำทับศัพท์ต่อไปนี้เป็นคำที่ถูกต้องและไม่ควรถือว่าเป็นข้อผิดพลาด:
- สถานที่: กรุงเทพมหานคร, เชียงใหม่, ภูเก็ต, ชลบุรี, พระนครศรีอยุธยา, สุโขทัย, นครราชสีมา, สงขลา, ขอนแก่น, กระบี่, สุราษฎร์ธานี, เชียงราย, แม่ฮ่องสอน, อุดรธานี, อุบลราชธานี, สยาม, สุขุมวิท, สีลม, อโศก, จตุจักร, เยาวราช, ทองหล่อ, วัดพระแก้ว, วัดอรุณ, พระบรมมหาราชวัง, ดอยสุเทพ, พัทยา, หัวหิน, เกาะสมุย, เกาะพีพี
- คำย่อทั่วไป: กก., กกต., กทพ., กทม., กปน., กปภ., กฟน., กฟผ., กม., ก.ย., ก.พ., กพร., กฟภ., กศน., กสทช., ก.ล.ต., กษ., กอ.รมน., ขสมก., คค., ครม., ค.ศ., คปภ., ชม., ซ., ซม., ด.ช., ด.ญ., ดีเอสไอ (DSI), ต., ต.ค., ตชด., ตร., ตร.กม., ตร.ม., ตลท., ถ., ทช., ทท., ทปอ., ทพ., ทล., ทอท., โทร., ธ.ก.ส., ธอส., ธปท., น., น.ส., น.พ., นายกฯ, บก.ป., บขส., บช.น., บจก., บมจ., ดอลลาร์, ปคบ., ปตท., ปตท.สผ., ป.ป.ง., ป.ป.ช., ป.ป.ส., ป.พ.พ., ป.วิ.แพ่ง, ป.วิ.อาญา, ปอท., ป.ตรี, ป.โท, ป.เอก, ปภ., ผบ.ตร., ผบ.ทบ., ผบ.ทร., ผบ.ทอ., ผบ.สส., ผวจ., ฯพณฯ, พ.ต.อ., พช., พ.ญ., พม., พ.ร.ก., พ.ร.ฎ., พ.ร.บ., พล.ต.อ., พล.อ., พ.ศ., ภก., ภญ., ม., มม., มท., ม.ร.ว., ม.ล., รง., ร.ต.อ., รพ., รฟท., รมช., รมว., รร., ร.อ., ลบ.ม., วช., ศธ., ศปก., ศอ.บต., ศาล รธน., สกสว., สคบ., ส.ค.ส., สตง., สตช., สธ., สน., ส.ป.ก., สปสช., สพฐ., สพ.ญ., สภ., สว., สวทช., สวทน., สส., สสส., สอศ., หจก., อ., อบจ., อบต., อปท., อย., อส., อสม., สมาชิกวุฒิสภา (สว.), สมาชิกสภาผู้แทนราษฎร (สส.)
- ชื่อบุคคลและคำเฉพาะ: พีระพันธุ์ สาลีรัฐวิภาค, เอกนัฏ พร้อมพันธุ์, ณัฐพงษ์ เรืองปัญญาวุฒิ, พริษฐ์ วัชรสินธุ, แคนดิเดต, โปรเจกต์, ล็อกสเปก, กาสิโน, เอ็นเตอร์เทนเมนต์คอมเพล็กซ์, สังเกตการณ์, สัญลักษณ์, สันนิษฐาน, สัมมนา, โควิด-19
- พรรคการเมืองและคำย่อ: พรรคก้าวไกล (ก.ก.), พรรคเพื่อไทย (พท.), พรรคภูมิใจไทย (ภท.), พรรคพลังประชารัฐ (พปชร.), พรรครวมไทยสร้างชาติ (รทสช.), พรรคประชาธิปัตย์ (ปชป.), พรรคชาติไทยพัฒนา (ชทพ.), พรรคประชาชาติ (ปช.), พรรคไทยสร้างไทย (ทสท.), พรรคชาติพัฒนากล้า (ชพก.), พรรคเพื่อไทรวมพลัง (พทล.), พรรคเสรีรวมไทย (สร.), พรรคเป็นธรรม (ปธ.), พรรคใหม่ (ใหม่), พรรคท้องที่ไทย (ทท.), พรรคครูไทยเพื่อประชาชน (ค.พ.ช.), พรรคพลังสังคมใหม่ (พสม.)
- คำทับศัพท์ภาษาอังกฤษ: คอมพิวเตอร์, เทคโนโลยี, อินเทอร์เน็ต, อีเมล, ซอฟต์แวร์, ฮาร์ดแวร์, แอปพลิเคชัน, โซเชียลมีเดีย, ออนไลน์, ดิจิทัล, เว็บไซต์, บล็อก, สมาร์ทโฟน, แท็บเล็ต, แบตเตอรี่, ดีไซน์, คอนเทนต์, มาร์เก็ตติ้ง, แบรนด์`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: text,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: temperature,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            console.warn("Gemini API returned an empty response text.");
            return [];
        }

        const corrections = JSON.parse(jsonText) as Correction[];
        return corrections;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a valid response from the AI model.");
    }
}

export async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
    const imagePart = {
        inlineData: {
            mimeType,
            data: base64Data,
        },
    };

    const textPart = {
        text: 'ดึงข้อความภาษาไทยและภาษาอังกฤษทั้งหมดออกจากรูปภาพนี้ หากไม่พบข้อความ ให้ส่งคืนสตริงว่าง',
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from the image using the AI model.");
    }
}