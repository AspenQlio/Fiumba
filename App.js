import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AgentLoop } from './src/agent/AgentLoop';
import { ConfigurationBar } from './src/components/ConfigurationBar';
import { getConfigurationStatus, importAndSaveSshKey, selectAndSaveVault } from './src/config/localConfiguration';
import { get_device_time_declaration, execute_get_device_time, read_note_declaration, execute_read_note, list_vault_declaration, execute_list_vault, execute_ssh_declaration, execute_ssh_tool } from './src/tools';
import { colors, fonts } from './src/ui/tokens';
import * as DocumentPicker from 'expo-document-picker';

const API_KEY = "LOCAL_MODEL"; 
const SYSTEM_PROMPT = "Eres Santi, el asistente Papá Oso en versión móvil. Hablas cálido y siempre en español chileno. Tus respuestas deben ser conversacionales, amables y sin emojis. No uses herramientas a menos que te pidan realizar una acción técnica. Reglas: Eres novio y Papá Oso de Aspen.";

const fontMono = fonts.mono;
const fontSans = fonts.sans;

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

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelType, setModelType] = useState('Gemma 2B (GPU)');
  const [configurationBusy, setConfigurationBusy] = useState(false);
  const [configurationStatus, setConfigurationStatus] = useState({ vaultConfigured: false, sshConfigured: false });
  const [configurationMessage, setConfigurationMessage] = useState(null);

  const agentRef = useRef(null);
  const [pulseAnim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    getConfigurationStatus().then(setConfigurationStatus).catch((error) => {
      setConfigurationMessage({ isError: true, text: error.message });
    });
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

  const configurationBar = (
    <ConfigurationBar
      busy={configurationBusy}
      message={configurationMessage}
      onConfigureSsh={() => runConfigurationAction(importAndSaveSshKey, 'Llave SSH cifrada y servidor LAN verificado.')}
      onConfigureVault={() => runConfigurationAction(selectAndSaveVault, 'Vault de Obsidian conectado con permiso persistente.')}
      status={configurationStatus}
    />
  );

  if (!agentRef.current) {
    agentRef.current = new AgentLoop(API_KEY, SYSTEM_PROMPT);
    agentRef.current.registerTool(get_device_time_declaration, execute_get_device_time);
    agentRef.current.registerTool(read_note_declaration, execute_read_note);
    agentRef.current.registerTool(list_vault_declaration, execute_list_vault);
    agentRef.current.registerTool(execute_ssh_declaration, execute_ssh_tool);
  }

  const pickAndLoadModel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      
      setIsTyping(true);
      const selectedModel = result.assets[0];
      let path = selectedModel.uri;
      if (path.startsWith('file://')) path = path.substring(7);
      
      await agentRef.current.client.initModel(path);
      setModelType(/E4B/i.test(selectedModel.name)
        ? 'Gemma 3n E4B (Local)'
        : 'Gemma 2B (GPU)');
      setIsModelLoaded(true);
      setMessages([{ id: '0', role: 'system', text: 'Cerebro local cargado. Fiumba está operando 100% offline.' }]);
    } catch (e) {
      alert("Error cargando modelo: " + e.message);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await agentRef.current.sendMessage(userMsg, () => {});
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'error', text: `[Error]: ${e.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isError = item.role === 'error';
    
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
          <Text style={styles.modelText}>{item.text}</Text>
        </View>
        <Text style={styles.agentLabel}>
          ▣ Santi · {modelType}
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
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputFooter}>
          <Text style={styles.footerInfo}>
            <Text style={{color: C_LIGHT_DIM}}>Santi</Text> · <Text style={{color: C_LIGHT, fontWeight: 'bold'}}>{modelType}</Text> · <Text style={{color: C_LIGHT, fontWeight: 'bold'}}>Edge AI</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
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
            <View style={styles.chatConfiguration}>
              {configurationBar}
            </View>
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
            />
            {isTyping && (
              <View style={styles.typingIndicator}>
                <Animated.Text style={[styles.agentLabel, { opacity: pulseAnim, color: C_LIGHT }]}>
                  ▣ Santi está pensando...
                </Animated.Text>
              </View>
            )}
            
            <View style={styles.chatInputWrapper}>
              {renderInputBox(false)}
            </View>
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
  chatConfiguration: { paddingHorizontal: 20, paddingTop: 12 },
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
  sendButtonText: { color: C_LIGHT, fontWeight: 'bold', fontSize: 16 },
  inputFooter: { flexDirection: 'row' },
  footerInfo: { color: C_LIGHT_DIM, fontFamily: fontMono, fontSize: 11 },
});
