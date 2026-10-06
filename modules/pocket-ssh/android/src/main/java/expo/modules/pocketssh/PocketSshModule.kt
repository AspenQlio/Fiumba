package expo.modules.pocketssh

import com.jcraft.jsch.JSch
import com.jcraft.jsch.Session
import com.jcraft.jsch.ChannelExec
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.util.Properties

class PocketSshModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PocketSsh")

    AsyncFunction("executeCommand") { host: String, port: Int, user: String, privateKey: String, knownHosts: String, command: String, promise: Promise ->
      Thread {
        var session: Session? = null
        var channel: ChannelExec? = null
        try {
          val jsch = JSch()
          jsch.addIdentity("remote-key", privateKey.toByteArray(), null, null)
          jsch.setKnownHosts(ByteArrayInputStream(knownHosts.toByteArray()))

          session = jsch.getSession(user, host, port)
          val config = Properties()
          config["StrictHostKeyChecking"] = "yes"
          config["PreferredAuthentications"] = "publickey"
          config["server_host_key"] = "ssh-ed25519"
          session.setConfig(config)
          
          session.connect(10000) // 10 seconds timeout

          channel = session.openChannel("exec") as ChannelExec
          channel.setCommand(command)
          channel.setInputStream(null)
          channel.setErrStream(null)

          val inStream: InputStream = channel.inputStream
          val errStream: InputStream = channel.errStream

          channel.connect(5000)

          val stdout = inStream.bufferedReader().use { it.readText() }
          val stderr = errStream.bufferedReader().use { it.readText() }

          val exitStatus = channel.exitStatus
          
          val result = mapOf(
            "stdout" to stdout,
            "stderr" to stderr,
            "exitCode" to exitStatus
          )
          
          promise.resolve(result)
        } catch (e: Exception) {
          promise.reject("ERR_SSH_EXEC", e.message, e)
        } finally {
          channel?.disconnect()
          session?.disconnect()
        }
      }.start()
    }
  }
}
