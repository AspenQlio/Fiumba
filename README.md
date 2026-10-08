# Fiumba (PocketOso) 🐻

Fiumba es un asistente de Inteligencia Artificial ("Agentic AI") nativo para Android, diseñado para ser tu copiloto técnico personal desde tu teléfono.

A diferencia de clientes web convencionales, Fiumba no solo charla contigo, sino que tiene "manos" gracias al _Function Calling_ (Llamada a Herramientas). Puede conectarse a tu bóveda de Obsidian para leer y escribir notas, e iniciar sesiones SSH en tus propios servidores a través de tu red local o Tailscale para ejecutar comandos en vivo.

## Características

- **Cerebro en la Nube (Gemini API)**: Inteligencia y velocidad utilizando la API de Google Gemini, configurable directamente desde la app.
- **Identidad Personalizable**: Cambia el "Prompt del Sistema" desde la configuración para definir el rol, personalidad y reglas de tu asistente.
- **Integración con Obsidian (Opcional)**: Puede leer y escribir archivos Markdown nativamente usando los permisos nativos de Android (SAF).
- **Grafo de Obsidian Integrado**: Visualizador interactivo local de tus notas, que permite hacer zoom (pellizco) y explorar tus conexiones, todo renderizado nativamente.
- **Ejecución Remota por SSH (Opcional)**: Fiumba puede lanzar comandos Bash en servidores que definas. Compatible con Tailscale y autenticación de llave pública estricta.

---

## 🚀 Instalación y Uso

### 1. Prerrequisitos

Necesitarás tener instalado [Node.js](https://nodejs.org/) y la CLI de [Expo](https://expo.dev/).

```bash
git clone https://github.com/tu-usuario/fiumba.git
cd fiumba
npm install
```

### 2. Configurar Dispositivos SSH (Opcional)

Si quieres usar la capacidad de Fiumba para ejecutar comandos en tus máquinas por SSH:
Edita el archivo `src/config/tailscaleDevices.mjs` y define tus propias IPs (LAN o Tailscale), usuario, puerto y huella (fingerprint) de la llave pública autorizada. 

### 3. Compilación e Instalación (Android)

Para generar la aplicación e instalarla en tu dispositivo Android (conectado por cable o ADB):

```bash
# Compilar y arrancar el entorno de desarrollo
npx expo start

# O para generar un APK release localmente (requiere JDK y Android SDK)
cd android
./gradlew :app:assembleRelease
```

---

## 🛠️ Configuración en la App

Al iniciar Fiumba por primera vez, verás la pantalla de inicio y una sección de **Config** en el menú superior derecho.

### API Key de Gemini
Entra a **Config** > **Configurar Gemini** y pega tu `API_KEY` (puedes obtenerla gratis en [Google AI Studio](https://aistudio.google.com/)). Tus credenciales se guardan **cifradas** en tu dispositivo de forma local mediante SecureStore.

### Prompt del Sistema (Personalidad)
En la sección inferior del panel **Config**, verás un recuadro llamado **Personalidad del Agente**. Aquí puedes definir quién es tu IA. 
Ejemplo:
> "Eres Fiumba, un experto en ciberseguridad y administrador de sistemas. Tus respuestas deben ser breves, al grano y estrictamente técnicas."

### Conectar tu "Segundo Cerebro" (Obsidian)
En **Config** > **Vault Obsidian**, Fiumba te pedirá permiso para acceder a una carpeta de tu teléfono. Selecciona la carpeta raíz de tu Vault de Obsidian. 
A partir de ese momento, puedes pedirle a Fiumba: *"Revisa mis notas de hoy"* o *"Crea una nota llamada Resumen con lo que acabamos de hablar"*.

### Llave SSH
Si documentaste tus servidores en `tailscaleDevices.mjs`, en **Config** > **SSH Tailscale** puedes importar la llave privada (archivo de texto) de la identidad autorizada. Todo se cifra localmente.

---

## Privacidad y Seguridad

- Fiumba fue diseñado bajo el principio de **"Local-first"**.
- Las credenciales API, rutas del Vault y llaves privadas SSH jamás se transmiten a servidores de telemetría. Quedan bloqueadas en el *Keystore* de tu Android.
- Solamente se envían a Gemini (o al LLM configurado) los historiales de chat y las lecturas explícitas que el Agente haga a través de sus herramientas.
