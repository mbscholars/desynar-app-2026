import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/constants/theme';

export default function InboxScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Inbox</Text>
      <Text style={styles.placeholder}>Conversations will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    fontFamily: typography.fontFamily.sans,
  },
  placeholder: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.sans,
  },
});
