import { GoogleGenAI, Type, Modality, LiveServerMessage, Blob } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface Attachment {
  data: string;
  mimeType: string;
}

/**
 * Deep, complex financial inquiry using Gemini 3 Pro with max thinking budget.
 */
export async function processFinancialInquiry(
  query: string, 
  currentContext: any, 
  attachments: Attachment[] = []
) {
  try {
    const parts: any[] = [
      { text: `CONTEXT:\n${JSON.stringify(currentContext)}\n\nUSER QUERY:\n${query}` }
    ];

    attachments.forEach(att => {
      parts.push({
        inlineData: { data: att.data, mimeType: att.mimeType }
      });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            kpis: {
              type: Type.OBJECT,
              properties: {
                cash: { type: Type.NUMBER },
                taxLiability: { type: Type.NUMBER },
                riskScore: { type: Type.NUMBER },
                runway: { type: Type.NUMBER }
              },
              required: ["cash", "taxLiability", "riskScore", "runway"]
            },
            agentDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agent: { type: Type.STRING },
                  recursiveLog: { type: Type.STRING },
                  refinementLog: { type: Type.STRING },
                  status: { type: Type.STRING }
                }
              }
            },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  desc: { type: Type.STRING }
                }
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            auditTrail: { type: Type.STRING }
          },
          required: ["summary", "kpis", "agentDetails", "anomalies", "recommendations", "auditTrail"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty swarm output");
    return JSON.parse(text);
  } catch (error) {
    console.error("Swarm logic error:", error);
    return null;
  }
}

/**
 * High-speed audio transcription using Gemini 3 Flash.
 */
export async function transcribeAudio(base64Audio: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
            { text: "Transcribe the following audio exactly. If no speech is heard, return an empty string." }
          ]
        }
      ],
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
}

/**
 * Low-latency fast response using Gemini 2.5 Flash Lite.
 */
export async function quickConsultation(query: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `Quickly summarize the answer to this business query in 2 sentences maximum: ${query}`,
    });
    return response.text;
  } catch (error) {
    console.error("Flash Lite Error:", error);
    return "I am processing your request at high speed.";
  }
}

/**
 * Professional TTS using Gemini 2.5 Flash Preview TTS.
 */
export async function generateSpeech(text: string, voiceName: string = 'Kore'): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS error:", error);
    return undefined;
  }
}

/**
 * Real-time Audio via Live API.
 */
export function connectLive(callbacks: {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror: (e: ErrorEvent) => void;
  onclose: (e: CloseEvent) => void;
}) {
  const liveAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return liveAi.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: SYSTEM_PROMPT + "\n\nYou are in a LIVE AUDIO CONVERSATION. Be concise, professional, and act as the collective intelligence of RuleKeeper.",
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
}

// Encoding/Decoding Utilities
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export function decodeAudio(base64: string): Uint8Array {
  return decode(base64);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}