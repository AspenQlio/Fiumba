import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AgentLoop } from './src/agent/AgentLoop';
import {
  getEngineCapabilityLabel,
  getEngineSystemMessage,
  normalizeEngineSystemMessages,
} from './src/agent/engineStatus.mjs';
import { formatToolReceipt } from './src/agent/toolReceipt.mjs';
import { GeminiCloudClient } from './src/agent/GeminiCloudClient';
import { ConfigurationBar } from './src/components/ConfigurationBar';
import { ObsidianGraphView } from './src/components/ObsidianGraphView';
import { getConfigurationStatus, importAndSaveSshKey, selectAndSaveVault, getModelConfig, saveModelConfig, getGeminiApiKey, saveGeminiApiKey, getSystemPrompt, saveSystemPrompt, DEFAULT_SYSTEM_PROMPT } from './src/config/localConfiguration';
import { get_device_time_declaration, execute_get_device_time, read_note_declaration, execute_read_note, list_vault_declaration, execute_list_vault, write_note_declaration, execute_write_note, execute_ssh_declaration, execute_ssh_tool, ask_server_llm_declaration, ask_server_llm_tool } from './src/tools';
import { colors, fonts } from './src/ui/tokens';
import Markdown from 'react-native-markdown-display';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = "LOCAL_MODEL";
const fontMono = fonts.mono;
const fontSans = fonts.sans;

const MODEL_STORAGE_DIR = `${FileSystem.documentDirectory}models/`;

const C_DARK = colors.surfacePrimary;
const C_DARK_DIM = colors.surfaceSecondary;
const C_LIGHT = colors.textPrimary;
const C_LIGHT_DIM = colors.textSecondary;
const C_LIGHT_FAINT = colors.borderSubtle;

const W = 32;
const H = 40;
const T = 10;
const GAP = 8;
const COLOR = C_LIGHT;

const F = () => (
  <View style={{marginTop: 16, width: W, height: H, marginRight: GAP}}>
    <View style={{position: 'absolute', top: 0, left: 0, width: W, height: T, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', top: 0, left: 0, width: T, height: H, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', top: (H-T)/2, left: 0, width: W - 6, height: T, backgroundColor: COLOR}} />
  </View>
);
const I = () => (
  <View style={{marginTop: 0, width: T, height: H + 16, marginRight: GAP}}>
    <View style={{position: 'absolute', top: 0, left: 0, width: T, height: T, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', bottom: 0, left: 0, width: T, height: H, backgroundColor: COLOR}} />
  </View>
);
const U = () => <View style={{marginTop: 16, width: W, height: H, borderBottomWidth: T, borderLeftWidth: T, borderRightWidth: T, borderColor: COLOR, marginRight: GAP}} />;
const M = () => (
  <View style={{marginTop: 16, width: 44, height: H, marginRight: GAP}}>
    <View style={{position: 'absolute', top: 0, left: 0, width: 44, height: T, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', top: 0, left: 0, width: T, height: H, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', top: 0, left: (44-T)/2, width: T, height: H, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', top: 0, right: 0, width: T, height: H, backgroundColor: COLOR}} />
  </View>
);
const B = () => (
  <View style={{marginTop: 0, width: W, height: H + 16, marginRight: GAP}}>
    <View style={{position: 'absolute', left: 0, top: 0, width: T, height: H + 16, backgroundColor: COLOR}} />
    <View style={{position: 'absolute', bottom: 0, left: 0, width: W, height: H, borderWidth: T, borderColor: COLOR}} />
  </View>
);
const A = () => (
  <View style={{marginTop: 16, width: W, height: H, marginRight: GAP}}>
    <View style={{width: W, height: H, borderTopWidth: T, borderLeftWidth: T, borderRightWidth: T, borderColor: COLOR}} />
    <View style={{position: 'absolute', top: (H-T)/2, left: 0, width: W, height: T, backgroundColor: COLOR}} />
  </View>
);

const FiumbaLogo = () => (
  <View style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 40, zIndex: 10}}>
    <F /><I /><U /><M /><B /><A />
  </View>
);

function toFileUri(pathOrUri) {
  if (!pathOrUri) return pathOrUri;
  if (pathOrUri.startsWith('file://') || pathOrUri.startsWith('content://')) return pathOrUri;
  return `file://${pathOrUri}`;
}

function toNativePath(pathOrUri) {
  if (!pathOrUri) return pathOrUri;
  return pathOrUri.startsWith('file://') ? pathOrUri.substring(7) : pathOrUri;
}

function sanitizeModelFileName(name) {
  return (name || 'gemma-local.litertlm').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureModelStorageDir() {
  const info = await FileSystem.getInfoAsync(MODEL_STORAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_STORAGE_DIR, { intermediates: true });
  }
}

async function importModelToStablePath(selectedModel) {
  await ensureModelStorageDir();

  const sourceUri = selectedModel.uri;
  const destinationUri = `${MODEL_STORAGE_DIR}${sanitizeModelFileName(selectedModel.name)}`;
  const destinationInfo = await FileSystem.getInfoAsync(destinationUri);

  if (!destinationInfo.exists) {
    await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  }

  return toNativePath(destinationUri);
}

const markdownStyles = {
  body: { color: C_LIGHT, fontFamily: fontMono, fontSize: 14, lineHeight: 22 },
  code_block: { backgroundColor: C_DARK, padding: 10, borderRadius: 4, fontFamily: fontMono, color: C_LIGHT, marginVertical: 8 },
  code_inline: { backgroundColor: C_DARK, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, fontFamily: fontMono, color: C_LIGHT },
  fence: { backgroundColor: C_DARK, padding: 10, borderRadius: 4, fontFamily: fontMono, color: C_LIGHT, marginVertical: 8 },
  strong: { fontWeight: 'bold', color: C_LIGHT },
  em: { fontStyle: 'italic', color: C_LIGHT },
  link: { color: C_LIGHT_DIM, textDecorationLine: 'underline' },
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHome, setShowHome] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState('Santi está pensando...');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelType, setModelType] = useState('Gemma 2B (GPU)');
  const [engineMode, setEngineMode] = useState('local');
  const [configurationBusy, setConfigurationBusy] = useState(false);
  const [configurationStatus, setConfigurationStatus] = useState({ vaultConfigured: false, sshConfigured: false });
  const [configurationMessage, setConfigurationMessage] = useState(null);
  const [showGeminiKeyModal, setShowGeminiKeyModal] = useState(false);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [systemPromptDraft, setSystemPromptDraft] = useState('');

  const agentRef = useRef(null);
  const engineModeRef = useRef('local');
  const flatListRef = useRef(null);
  const [pulseAnim] = useState(() => new Animated.Value(0.3));

  function createNewSession() {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([{ id: '0', role: 'system', text: getEngineSystemMessage(engineModeRef.current) }]);
    if (agentRef.current) agentRef.current.history = [];
    setShowSessions(false);
    setShowGraph(false);
    setShowHome(true);
  }

  async function loadSession(id, { openChat = true } = {}) {
    const data = await AsyncStorage.getItem(id);
    if (data) {
      const parsedMessages = JSON.parse(data);
      const loadedMsgs = normalizeEngineSystemMessages(parsedMessages, engineModeRef.current);
      setMessages(loadedMsgs);
      setCurrentSessionId(id);
      if (JSON.stringify(loadedMsgs) !== data) {
        await AsyncStorage.setItem(id, JSON.stringify(loadedMsgs));
      }
      if (agentRef.current) {
        agentRef.current.history = loadedMsgs
          .filter(m => m.role !== 'system' && m.role !== 'tool')
          .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
      }
    }
    setShowSessions(false);
    setShowGraph(false);
    if (openChat) setShowHome(false);
  }

  async function deleteSession(id) {
    await AsyncStorage.removeItem(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      createNewSession();
    }
  }

  async function initSessions() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith('session_')).sort().reverse();
      if (sessionKeys.length > 0) {
        const sessionData = await AsyncStorage.multiGet(sessionKeys);
        const loadedSessions = sessionData.map(([key, value]) => {
          const msgs = JSON.parse(value);
          const firstUserMsg = msgs.find(m => m.role === 'user');
          return {
            id: key,
            preview: firstUserMsg ? firstUserMsg.text.substring(0, 30) + '...' : "Nueva conversación"
          };
        });
        setSessions(loadedSessions);
        createNewSession();
      } else {
        createNewSession();
      }
    } catch (e) {
      console.warn(e);
      createNewSession();
    }
  }

  async function activateGeminiClient(apiKey) {
    agentRef.current.setClient(new GeminiCloudClient(apiKey));
    engineModeRef.current = 'cloud';
    setEngineMode('cloud');
    setModelType('Gemini Flash (Cloud)');
    setIsModelLoaded(true);
    await initSessions();
  }

  useEffect(() => {
    getConfigurationStatus().then(setConfigurationStatus).catch((error) => {
      setConfigurationMessage({ isError: true, text: error.message });
    });

    const attemptAutoLoad = async () => {
      try {
        const geminiApiKey = await getGeminiApiKey();
        if (geminiApiKey) {
          await activateGeminiClient(geminiApiKey);
          return;
        }
      } catch (error) {
        console.error("Error auto-loading engine:", error);
      }
    };

    if (!agentRef.current) {
      agentRef.current = new AgentLoop(API_KEY, "");
      getSystemPrompt().then(prompt => agentRef.current.systemInstruction = prompt);
      agentRef.current.registerTool(get_device_time_declaration, execute_get_device_time);
      agentRef.current.registerTool(read_note_declaration, execute_read_note);
      agentRef.current.registerTool(list_vault_declaration, execute_list_vault);
      agentRef.current.registerTool(write_note_declaration, execute_write_note);
      agentRef.current.registerTool(execute_ssh_declaration, execute_ssh_tool);
      agentRef.current.registerTool(ask_server_llm_declaration, ask_server_llm_tool);

      agentRef.current.registerTool(list_vault_declaration, execute_list_vault);
      agentRef.current.registerTool(write_note_declaration, execute_write_note);
      agentRef.current.registerTool(execute_ssh_declaration, execute_ssh_tool);
    }

    attemptAutoLoad();
  }, []);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isTyping, pulseAnim]);

  const runConfigurationAction = async (action, successText) => {
    setConfigurationBusy(true);
    setConfigurationMessage(null);
    try {
      const changed = await action();
      if (!changed) return;
      setConfigurationStatus(await getConfigurationStatus());
      setConfigurationMessage({ isError: false, text: successText });
    } catch (error) {
      setConfigurationMessage({ isError: true, text: error.message });
    } finally {
      setConfigurationBusy(false);
    }
  };

  const saveGeminiKeyFromModal = async () => {
    await runConfigurationAction(async () => {
      const changed = await saveGeminiApiKey(geminiKeyDraft);
      if (changed) {
        await activateGeminiClient(geminiKeyDraft);
        setShowGeminiKeyModal(false);
        setGeminiKeyDraft('');
      }
      return changed;
    }, 'Gemini API configurado. Fiumba usará cerebro cloud y mantendrá Obsidian/SSH local.');
  };


  useEffect(() => {
    if (showConfiguration) {
      getSystemPrompt().then(setSystemPromptDraft);
    }
  }, [showConfiguration]);


  const saveSystemPromptFromModal = async () => {
    await runConfigurationAction(async () => {
      const changed = await saveSystemPrompt(systemPromptDraft);
      if (changed) {
        if (agentRef.current) agentRef.current.systemInstruction = systemPromptDraft;
      }
      return changed;
    }, 'Prompt del sistema actualizado.');
  };

  const configurationBar = (
    <ConfigurationBar
      busy={configurationBusy}
      message={configurationMessage}
      onConfigureGemini={() => setShowGeminiKeyModal(true)}
      onConfigureSsh={() => runConfigurationAction(importAndSaveSshKey, 'Llave SSH cifrada y servidor Tailscale verificado.')}
      onConfigureVault={() => runConfigurationAction(selectAndSaveVault, 'Vault de Obsidian conectado con permiso persistente.')}
      status={configurationStatus}
    />
  );

  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (!firstUserMsg) return;
      AsyncStorage.setItem(currentSessionId, JSON.stringify(messages));

      // Update session list preview dynamically
      setSessions(prev => {
        const existing = prev.find(s => s.id === currentSessionId);
        const previewText = firstUserMsg.text.substring(0, 30) + '...';

        if (existing) {
          return prev.map(s => s.id === currentSessionId ? { ...s, preview: previewText } : s);
        } else {
          return [{ id: currentSessionId, preview: previewText }, ...prev];
        }
      });
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    if (!isModelLoaded || showHome || showSessions || showGraph || messages.length === 0) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, [isModelLoaded, messages.length, showGraph, showHome, showSessions]);

  const pickAndLoadModel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });
      if (result.canceled) return;

      setIsTyping(true);
      const selectedModel = result.assets[0];
      const path = await importModelToStablePath(selectedModel);

      await agentRef.current.client.initModel(path);
      const mType = /E4B/i.test(selectedModel.name) ? 'Gemma 3n E4B (Local)' : 'Gemma 2B (GPU)';
      setModelType(mType);
      await saveModelConfig(path, mType);

      setIsModelLoaded(true);
      await initSessions();
    } catch (e) {
      alert("Error cargando modelo: " + e.message);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (isTyping) return;
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();

    setShowHome(false);
    setShowSessions(false);
    setShowGraph(false);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setInputText('');
    setIsTyping(true);
    setStatusText('Santi está pensando...');

    try {
      const response = await agentRef.current.sendMessage(
        userMsg,
        () => {},
        setStatusText,
        toolResult => {
          setMessages(prev => [...prev, {
            id: `tool-${Date.now()}-${prev.length}`,
            role: 'tool',
            text: formatToolReceipt(toolResult),
          }]);
        },
      );
      if (response.trim()) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'error', text: `[Error]: ${e.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }) => {
    if (item.role === 'system') return null;

    const isUser = item.role === 'user';
    const isError = item.role === 'error';
    const isTool = item.role === 'tool';

    if (isUser) {
      return (
        <View style={styles.messageWrapper}>
          <View style={[styles.blockContainer, { borderLeftColor: C_LIGHT }]}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageWrapper}>
        <View style={[styles.blockContainer, { borderLeftColor: isError ? C_LIGHT_FAINT : C_LIGHT_DIM }]}>
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        </View>
        <Text style={styles.agentLabel}>
          {isTool ? '▣ Comprobante de herramienta' : `▣ Santi · ${modelType}`}
        </Text>
      </View>
    );
  };

  const renderInputBox = (isWelcome = false) => (
    <View style={[styles.inputBoxContainer, isWelcome && { zIndex: 10 }]}>
      <View style={styles.inputBoxInner}>
        <View style={styles.inputRow}>
          <Animated.View style={[styles.cursor, { opacity: pulseAnim }]} />
          <TextInput
            style={Platform.OS === 'web' ? [styles.inputField, { outlineStyle: 'none' }] : styles.inputField}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            placeholder={isWelcome ? 'Escribe aquí...' : ''}
            placeholderTextColor={C_LIGHT_FAINT}
            autoCapitalize="none"
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity disabled={isTyping} onPress={sendMessage} style={[styles.sendButton, isTyping && styles.sendButtonDisabled]}>
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputFooter}>
          <Text style={styles.footerInfo}>
          <Text style={{color: C_LIGHT_DIM}}>Santi</Text> · <Text style={{color: C_LIGHT, fontWeight: 'bold'}}>{modelType}</Text> · <Text style={{color: C_LIGHT, fontWeight: 'bold'}}>{getEngineCapabilityLabel(engineMode)}</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <Modal animationType="fade" transparent visible={showGeminiKeyModal} onRequestClose={() => setShowGeminiKeyModal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Configurar Gemini API</Text>
              <Text style={styles.modalText}>Pega aquí la misma GOOGLE_API_KEY de Cisternin. Se guardará cifrada en este dispositivo.</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setGeminiKeyDraft}
                placeholder="AIza..."
                placeholderTextColor={C_LIGHT_FAINT}
                secureTextEntry
                style={styles.modalInput}
                value={geminiKeyDraft}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowGeminiKeyModal(false)} style={styles.modalButtonSecondary}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveGeminiKeyFromModal} style={styles.modalButtonPrimary}>
                  <Text style={styles.modalButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal animationType="fade" transparent visible={showConfiguration} onRequestClose={() => setShowConfiguration(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.configurationModalCard}>
              <View style={styles.configurationModalHeader}>
                <Text style={styles.modalTitle}>Configuración local</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => setShowConfiguration(false)} style={styles.modalButtonSecondary}>
                  <Text style={styles.modalButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
              {configurationBar}
              <Text style={[styles.modalTitle, { marginTop: 24 }]}>Personalidad del Agente</Text>
              <Text style={styles.modalText}>Instrucciones de sistema (Prompt) que guían el comportamiento de la IA.</Text>
              <TextInput
                multiline
                onChangeText={setSystemPromptDraft}
                style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
                value={systemPromptDraft}
              />
              <TouchableOpacity onPress={saveSystemPromptFromModal} style={[styles.modalButtonPrimary, { alignSelf: 'flex-end' }]}>
                <Text style={styles.modalButtonText}>Guardar Prompt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {!isModelLoaded ? (
          <View style={styles.welcomeContainer}>
            <View style={styles.bgDarkBlock} />
            <View style={styles.bgRedCircle} />
            <View style={styles.bgBlackCircle} />

            <FiumbaLogo />

            <View style={[styles.inputBoxContainer, { padding: 20, alignItems: 'center', zIndex: 10 }]}>
              <Text style={{color: C_LIGHT, fontFamily: fontMono, marginBottom: 15, textAlign: 'center'}}>
                Selecciona el archivo .bin de Gemma para cargarlo a la NPU
              </Text>
              <TouchableOpacity onPress={pickAndLoadModel} style={{backgroundColor: C_LIGHT, padding: 15, borderRadius: 4, width: '100%', alignItems: 'center'}}>
                <Text style={{color: C_DARK, fontFamily: fontMono, fontWeight: 'bold', fontSize: 16}}>
                  {isTyping ? "Copiando y cargando..." : "Seleccionar Archivo"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.welcomeConfiguration}>
              {configurationBar}
            </View>

          </View>
        ) : (

          <View style={styles.chatContainer}>
            {!showHome && (
              <View style={styles.appHeader}>
                <TouchableOpacity accessibilityRole="button" onPress={createNewSession} style={styles.brandButton}>
                  <Text style={styles.brandText}>FIUMBA</Text>
                </TouchableOpacity>
                <View style={styles.segmentedNav}>
                  <TouchableOpacity accessibilityRole="button" onPress={() => { setShowSessions(false); setShowGraph(false); }} style={[styles.segmentButton, !showGraph && !showSessions && styles.segmentButtonActive]}>
                    <Text style={[styles.segmentText, !showGraph && !showSessions && styles.segmentTextActive]}>Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" onPress={() => { setShowSessions(false); setShowGraph(true); }} style={[styles.segmentButton, showGraph && styles.segmentButtonActive]}>
                    <Text style={[styles.segmentText, showGraph && styles.segmentTextActive]}>Grafo</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity accessibilityRole="button" onPress={() => setShowConfiguration(true)} style={styles.configButton}>
                  <Text style={styles.configButtonText}>Config</Text>
                </TouchableOpacity>
              </View>
            )}

            {showHome ? (
              <View style={styles.homeContainer}>
                <View style={styles.homeHalo} />
                <FiumbaLogo />
                <Text style={styles.homeEngine}>{modelType} · {getEngineCapabilityLabel(engineMode)}</Text>
                <View style={styles.homeComposer}>
                  {renderInputBox(true)}
                </View>
                <TouchableOpacity accessibilityRole="button" onPress={() => { setShowHome(false); setShowSessions(true); setShowGraph(false); }} style={styles.sessionsButton}>
                  <Text style={styles.sessionsButtonText}>Sesiones</Text>
                </TouchableOpacity>
              </View>
            ) : showSessions ? (
              <View style={{flex: 1, backgroundColor: C_DARK, padding: 20}}>
                <TouchableOpacity onPress={createNewSession} style={{marginBottom: 20, padding: 15, backgroundColor: C_DARK_DIM, borderRadius: 8}}>
                  <Text style={{color: C_LIGHT, fontFamily: fontMono, textAlign: 'center'}}>+ Nueva Conversación</Text>
                </TouchableOpacity>
                <FlatList
                  data={sessions}
                  keyExtractor={s => s.id}
                  renderItem={({item}) => (
                    <View style={{flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C_DARK_DIM}}>
                      <TouchableOpacity onPress={() => loadSession(item.id)} style={{flex: 1, padding: 15}}>
                        <Text style={{color: item.id === currentSessionId ? COLOR : C_LIGHT, fontFamily: fontMono}}>
                          {item.preview}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteSession(item.id)} style={{padding: 15}}>
                        <Text style={{color: colors.statusError, fontFamily: fontMono}}>✖</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
                <TouchableOpacity onPress={() => { setShowSessions(false); setShowHome(true); }} style={{marginTop: 20, padding: 15}}>
                  <Text style={{color: C_LIGHT_DIM, fontFamily: fontMono, textAlign: 'center'}}>Volver al inicio</Text>
                </TouchableOpacity>
              </View>
            ) : showGraph ? (
              <ObsidianGraphView />
            ) : (
              <>
                <FlatList
              ref={flatListRef}

              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
            {isTyping && (
              <View style={styles.typingIndicator}>
                <Animated.Text style={[styles.agentLabel, { opacity: pulseAnim, color: C_LIGHT }]}>
                  ▣ {statusText}
                </Animated.Text>
              </View>
            )}

            <View style={styles.chatInputWrapper}>
              {renderInputBox(false)}
            </View>
            </>
            )}
          </View>
        )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C_DARK },
  welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, backgroundColor: C_DARK, overflow: 'hidden' },
  welcomeConfiguration: { width: '100%', marginTop: 16, zIndex: 10 },
  bgDarkBlock: { position: 'absolute', left: '10%', width: 250, height: 350, backgroundColor: C_DARK_DIM, borderRadius: 20, opacity: 0.8 },
  bgRedCircle: { position: 'absolute', right: '50%', width: 150, height: 300, backgroundColor: C_DARK_DIM, borderTopLeftRadius: 150, borderBottomLeftRadius: 150 },
  bgBlackCircle: { position: 'absolute', left: '50%', width: 150, height: 300, backgroundColor: C_DARK, borderTopRightRadius: 150, borderBottomRightRadius: 150 },
  chatContainer: { flex: 1, backgroundColor: C_DARK },
  homeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden' },
  homeHalo: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: C_DARK_DIM, opacity: 0.72 },
  homeEngine: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 11, marginTop: -22, marginBottom: 26, textTransform: 'uppercase', letterSpacing: 1 },
  homeComposer: { width: '100%', maxWidth: 600, zIndex: 2 },
  sessionsButton: { minHeight: 44, justifyContent: 'center', marginTop: 14, paddingHorizontal: 18, borderColor: C_LIGHT_FAINT, borderWidth: 1, borderRadius: 4, zIndex: 2 },
  sessionsButtonText: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  appHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C_DARK_DIM, gap: 10 },
  brandButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  brandText: { color: C_LIGHT, fontFamily: fontMono, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  segmentedNav: { flex: 1, maxWidth: 180, flexDirection: 'row', backgroundColor: C_DARK_DIM, borderRadius: 5, padding: 3 },
  segmentButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  segmentButtonActive: { backgroundColor: C_LIGHT },
  segmentText: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 11, fontWeight: '700' },
  segmentTextActive: { color: C_DARK },
  configButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  configButtonText: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 11, fontWeight: '700' },
  listContent: { padding: 20, paddingBottom: 40 },
  messageWrapper: { marginBottom: 24, width: '100%', maxWidth: 800, alignSelf: 'center' },
  blockContainer: { backgroundColor: C_DARK_DIM, borderLeftWidth: 2, padding: 16, borderRadius: 4 },
  userText: { color: C_LIGHT, fontFamily: fontMono, fontSize: 14, lineHeight: 22 },
  modelText: { color: C_LIGHT, fontFamily: fontMono, fontSize: 14, lineHeight: 22 },
  agentLabel: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 12, marginTop: 8, marginLeft: 4 },
  typingIndicator: { paddingHorizontal: 20, paddingBottom: 20, maxWidth: 800, alignSelf: 'center', width: '100%' },
  chatInputWrapper: { padding: 20, paddingBottom: 10, backgroundColor: C_DARK, width: '100%', maxWidth: 840, alignSelf: 'center' },
  inputBoxContainer: { width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: C_DARK_DIM, borderLeftWidth: 2, borderLeftColor: C_LIGHT, borderRadius: 2, boxShadow: '0 10px 10px rgba(0, 0, 0, 0.2)' },
  inputBoxInner: { padding: 16, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cursor: { width: 8, height: 18, backgroundColor: C_LIGHT, marginRight: 10 },
  inputField: { flex: 1, color: C_LIGHT, fontFamily: fontMono, fontSize: 15, padding: 0 },
  sendButton: { paddingHorizontal: 15, paddingVertical: 5, backgroundColor: C_LIGHT_FAINT, borderRadius: 4, marginLeft: 10 },
  sendButtonDisabled: { opacity: 0.45 },
  sendButtonText: { color: C_LIGHT, fontWeight: 'bold', fontSize: 16 },
  inputFooter: { flexDirection: 'row' },
  footerInfo: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: C_DARK_DIM, borderLeftColor: C_LIGHT, borderLeftWidth: 2, padding: 18, borderRadius: 6 },
  configurationModalCard: { backgroundColor: C_DARK, borderLeftColor: C_LIGHT, borderLeftWidth: 2, padding: 18, borderRadius: 6 },
  configurationModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: C_LIGHT, fontFamily: fontMono, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  modalText: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  modalInput: { borderColor: C_LIGHT_FAINT, borderWidth: 1, color: C_LIGHT, fontFamily: fontMono, padding: 12, marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButtonPrimary: { backgroundColor: C_LIGHT_FAINT, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4 },
  modalButtonSecondary: { borderColor: C_LIGHT_FAINT, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4 },
  modalButtonText: { color: C_LIGHT, fontFamily: fontMono, fontWeight: '700' },
});
