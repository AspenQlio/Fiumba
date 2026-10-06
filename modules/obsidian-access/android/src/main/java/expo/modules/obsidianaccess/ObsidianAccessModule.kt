package expo.modules.obsidianaccess

import android.net.Uri
import android.provider.DocumentsContract
import androidx.documentfile.provider.DocumentFile
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.BufferedReader
import java.io.InputStreamReader

class ObsidianAccessModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ObsidianAccess")

    AsyncFunction("readFile") { uriString: String, promise: Promise ->
      try {
        val uri = Uri.parse(uriString)
        val context = appContext.reactContext ?: throw Exception("React context is null")
        val contentResolver = context.contentResolver
        
        val inputStream = contentResolver.openInputStream(uri)
        val reader = BufferedReader(InputStreamReader(inputStream))
        val content = reader.use { it.readText() }
        
        promise.resolve(content)
      } catch (e: Exception) {
        promise.reject("ERR_READ_FILE", e.message, e)
      }
    }
    
    AsyncFunction("listFiles") { uriString: String, promise: Promise ->
      try {
        val uri = Uri.parse(uriString)
        val context = appContext.reactContext ?: throw Exception("React context is null")
        
        val dir = DocumentFile.fromTreeUri(context, uri)
        if (dir != null && dir.isDirectory) {
          val files = dir.listFiles().map { 
             mapOf(
               "name" to it.name,
               "uri" to it.uri.toString(),
               "isDirectory" to it.isDirectory
             )
          }
          promise.resolve(files)
        } else {
          promise.reject("ERR_NOT_DIR", "URI is not a directory or null", null)
        }
      } catch (e: Exception) {
         promise.reject("ERR_LIST_FILES", e.message, e)
      }
    }
  }
}
