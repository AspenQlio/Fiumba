import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, spacing } from '../ui/tokens';

function ConfigurationButton({ configured, disabled, label, onPress }) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, configured && styles.configuredButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.buttonText, configured && styles.configuredText]}>
        {configured ? `${label}: listo` : label}
      </Text>
    </TouchableOpacity>
  );
}

export function ConfigurationBar({ busy, message, onConfigureSsh, onConfigureVault, status }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>CONFIGURACIÓN LOCAL</Text>
      <View style={styles.actions}>
        <ConfigurationButton
          configured={status.vaultConfigured}
          disabled={busy}
          label="Vault Obsidian"
          onPress={onConfigureVault}
        />
        <ConfigurationButton
          configured={status.sshConfigured}
          disabled={busy}
          label="SSH LAN"
          onPress={onConfigureSsh}
        />
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.message, message?.isError && styles.error]}>
        {busy ? 'Abriendo selector seguro…' : message?.text ?? 'Las credenciales permanecen cifradas en este dispositivo.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderLeftColor: colors.borderSubtle,
    borderLeftWidth: 2,
    padding: spacing[4],
  },
  heading: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: 11,
    marginBottom: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  button: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
  },
  configuredButton: {
    borderColor: colors.statusSuccess,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  configuredText: {
    color: colors.statusSuccess,
  },
  message: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing[3],
  },
  error: {
    color: colors.statusError,
  },
});
