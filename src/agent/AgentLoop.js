import { LocalGemmaClient } from './LocalGemmaClient';
import { compactDirectToolHistory, compactToolExchangeHistory, createDirectToolCall, selectToolsForMessage } from './gemmaPrompt.mjs';

export class AgentLoop {
  constructor(apiKey, systemInstruction) {
    this.client = new LocalGemmaClient(apiKey);
    this.systemInstruction = systemInstruction;
    this.history = [];
    this.availableTools = {}; 
    this.toolDeclarations = [];
  }

  registerTool(declaration, executeFn) {
    this.toolDeclarations.push(declaration);
    this.availableTools[declaration.name] = executeFn;
  }

  async sendMessage(userText, onProgress) {
    const toolsForTurn = selectToolsForMessage(userText, this.toolDeclarations);
    this.history.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    let isDone = false;
    let finalResponse = "";
    let iteration = 0;
    let toolsAvailable = toolsForTurn;
    let pendingParts = createDirectToolCall(toolsForTurn, userText);

    while (!isDone && iteration < 3) {
      iteration += 1;
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
        toolsAvailable = [];
        const functionResponses = [];
        let directResult = null;

        const { name, args } = functionCalls[0].functionCall;
        console.log(`[AgentLoop] Executing tool: ${name}`, args);

        let result;
        try {
          if (!this.availableTools[name]) {
            throw new Error(`Tool ${name} not found`);
          }
          result = await this.availableTools[name](args);
          const declaration = this.toolDeclarations.find(tool => tool.name === name);
          if (declaration?.returnResultDirectly === true) {
            directResult = String(result);
          }
        } catch (err) {
          result = { error: err.message };
          console.error(`[AgentLoop] Tool error:`, err);
        }

        functionResponses.push({
          functionResponse: {
            name,
            response: { result }
          }
        });

        if (directResult !== null) {
          this.history = compactDirectToolHistory(this.history);
          finalResponse = directResult;
          if (onProgress) onProgress(finalResponse);
          isDone = true;
        } else {
          this.history.push({
            role: 'user',
            parts: functionResponses
          });
        }
      } else {
        this.history = compactToolExchangeHistory(this.history);
        isDone = true;
      }
    }

    return finalResponse;
  }
}
