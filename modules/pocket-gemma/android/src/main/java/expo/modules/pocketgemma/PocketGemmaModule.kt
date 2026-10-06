package expo.modules.pocketgemma

import com.google.mediapipe.tasks.genai.llminference.LlmInference
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PocketGemmaModule : Module() {
  private var llmInference: LlmInference? = null
  private val moduleScope = CoroutineScope(Dispatchers.IO)

  override fun definition() = ModuleDefinition {
    Name("PocketGemma")

    AsyncFunction("loadModel") { modelPath: String, promise: Promise ->
      moduleScope.launch {
        try {
          if (!File(modelPath).exists()) {
             throw Exception("Model file not found at $modelPath")
          }
          val context = appContext.reactContext ?: throw Exception("React context is null")
          val options = LlmInference.LlmInferenceOptions.builder()
              .setModelPath(modelPath)
              .setMaxTokens(256)
              .build()
          
          llmInference = LlmInference.createFromOptions(context, options)
          promise.resolve("Model loaded successfully")
        } catch (e: Exception) {
          promise.reject("ERR_LOAD_MODEL", e.message, e)
        }
      }
    }

    AsyncFunction("generate") { prompt: String, promise: Promise ->
      moduleScope.launch {
        try {
          val llm = llmInference ?: throw Exception("Model not loaded. Call loadModel first.")
          val response = llm.generateResponse(prompt)
          promise.resolve(response)
        } catch (e: Exception) {
          promise.reject("ERR_GENERATE", e.message, e)
        }
      }
    }
  }
}
