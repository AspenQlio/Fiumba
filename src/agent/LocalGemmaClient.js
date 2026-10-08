import { Platform } from 'react-native';
import { loadModel, generate } from '../../modules/pocket-gemma/index';
import { buildGemmaPrompt, parseGemmaResponse, prepareLocalGenerationHistory } from './gemmaPrompt.mjs';

export class LocalGemmaClient {
  constructor() {
    this.isLoaded = false;
    this.modelPath = null;
  }

  async initModel(path) {
    if (Platform.OS === 'web') {
      this.isLoaded = true;
      return;
    }
    await loadModel(path);
    this.isLoaded = true;
    this.modelPath = path;
  }

  async generateResponse(history, tools = [], systemInstruction = null) {
    if (!this.isLoaded) throw new Error("Gemma model not loaded in GPU.");
    const prompt = buildGemmaPrompt(prepareLocalGenerationHistory(history), systemInstruction, tools);

    let rawResponse = "";
    if (Platform.OS === 'web') {
       rawResponse = "Soy Gemma en la web. Todo ok.";
    } else {
       rawResponse = await generate(prompt);
    }
    return parseGemmaResponse(rawResponse, tools.map(({ name }) => name));
  }
}
