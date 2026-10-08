# Fiumba

Fiumba is a native Android AI assistant. It acts as a technical copilot on your phone.

Fiumba chats with you and executes tools. It connects to your Obsidian vault to read and write notes. It also starts SSH sessions on your servers through your local network or Tailscale.

## Features

- **Cloud Brain (Gemini API):** The app uses the Google Gemini API. You can configure the API directly in the app.
- **Custom Identity:** You can change the System Prompt to set the role and rules for the assistant.
- **Obsidian Integration:** Fiumba reads and writes Markdown files natively. It uses the Android Storage Access Framework (SAF).
- **Obsidian Graph:** The app shows an interactive local graph of your notes. You can pinch to zoom and drag to explore connections.
- **SSH Execution:** Fiumba can run Bash commands on your servers. It uses Tailscale and strict public key authentication.

---

## Installation

### 1. Prerequisites

You must install [Node.js](https://nodejs.org/) and the [Expo](https://expo.dev/) CLI.

```bash
git clone https://github.com/AspenQlio/Fiumba.git
cd Fiumba
npm install
```

### 2. Configure SSH Devices (Optional)

If you want to run commands on your servers, configure the devices:
1. Edit `src/config/tailscaleDevices.mjs`.
2. Set your IP addresses, user, port, and the public key fingerprint.

### 3. Compile and Install (Android)

To make the application and install it on your Android device:

```bash
# Start the development environment
npx expo start

# Make a local release APK
cd android
./gradlew :app:assembleRelease
```

---

## Configuration

When you start Fiumba, you see the home screen and a **Config** section.

### Gemini API Key

1. Go to **Config** > **Configurar Gemini**.
2. Paste your `API_KEY`. 

The device encrypts and saves your credentials locally.

### System Prompt

1. Go to the bottom of the **Config** panel. 
2. Type the rules for your AI in the **Personalidad del Agente** box.

### Connect your Obsidian Vault

1. Go to **Config** > **Vault Obsidian**.
2. Fiumba asks for permission to access a folder.
3. Select the root folder of your Obsidian Vault.

### SSH Key

If you added your servers to `tailscaleDevices.mjs`, you can import your private key. 
1. Go to **Config** > **SSH Tailscale**.
2. Select your private key text file. 

The app encrypts the key locally.

---

## Privacy and Security

- Fiumba is a local-first application.
- The app does not send API credentials, Vault paths, or SSH keys to telemetry servers.
- The app locks credentials in the Android Keystore.
- The app only sends chat history and explicit note reads to the Gemini API.
