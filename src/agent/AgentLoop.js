import { GeminiCloudClient } from './GeminiCloudClient';
import { compactToolExchangeHistory } from './gemmaPrompt.mjs';

export class AgentLoop {
  constructor(apiKey, systemInstruction) {
    this.client = new GeminiCloudClient(apiKey);
    this.systemInstruction = systemInstruction;
    this.history = [];
    this.availableTools = {};
    this.toolDeclarations = [];
  }

  setClient(client) {
    this.client = client;
  }

  registerTool(declaration, executeFn) {
    this.toolDeclarations.push(declaration);
    this.availableTools[declaration.name] = executeFn;
  }

  async sendMessage(userText, onProgress, onStatus, onToolResult) {
    this.history.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    let isDone = false;
    let finalResponse = "";
    let iteration = 0;
    let toolsAvailable = this.toolDeclarations;
    let pendingParts = null;

    while (!isDone && iteration < 5) {
      iteration += 1;

      if (onStatus) onStatus("Santi está pensando...");

      const parts = pendingParts
        ? [pendingParts]
        : await this.client.generateResponse(
            this.history,
            toolsAvailable,
            this.systemInstruction
          );
      pendingParts = null;

      // If parts is empty or undefined, handle gracefully
      if (!parts || parts.length === 0) {
         isDone = true;
         break;
      }

      this.history.push({
        role: 'model',
        parts: parts
      });

      const functionCalls = parts.filter(p => p.functionCall);
      const textParts = parts.filter(p => p.text);

      if (textParts.length > 0) {
        finalResponse += textParts.map(p => p.text).join('\n');
        if (onProgress) onProgress(finalResponse);
      }

      if (functionCalls.length > 0) {
        toolsAvailable = this.toolDeclarations; // Let the model use tools again if needed
        const functionResponses = [];

        for (const part of functionCalls) {
          const { name, args, id } = part.functionCall;
          console.log(`[AgentLoop] Executing tool: ${name}`, args);
          if (onStatus) onStatus(`Ejecutando ${name}...`);

          let result;
          let toolSucceeded = true;
          try {
            if (!this.availableTools[name]) {
              throw new Error(`Tool ${name} not found`);
            }
            result = await this.availableTools[name](args);
          } catch (err) {
            toolSucceeded = false;
            result = { error: err.message };
            console.error(`[AgentLoop] Tool error:`, err);
          }

          if (onToolResult) {
            onToolResult({
              name,
              args,
              ok: toolSucceeded,
              result: toolSucceeded ? result : result.error,
            });
          }

          const functionResponse = {
            name,
            response: { result }
          };
          if (id) functionResponse.id = id;

          functionResponses.push({ functionResponse });
        }

        this.history.push({
          role: 'user', // Gemini expects functionResponse from user role
          parts: functionResponses
        });
      } else {
        this.history = compactToolExchangeHistory(this.history);
        isDone = true;
      }
    }

    return finalResponse;
  }
}
