import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/constants/theme';

function GoogleIcon() {
  return <FontAwesome name="google" size={20} color={colors.gray[800]} />;
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await login();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      await login();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => router.back();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Button
          title="Sign up with Google"
          onPress={handleGoogle}
          variant="outline"
          fullWidth
          leftIcon={<GoogleIcon />}
          disabled={loading}
        />

        <Divider text="or" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="First Name"
              required
              placeholder="Enter your first"
              value={firstName}
              onChangeText={setFirstName}
              containerStyle={styles.halfInput}
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Last Name"
              required
              placeholder="Enter your last"
              value={lastName}
              onChangeText={setLastName}
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        <Input
          label="Email"
          required
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Phone"
          required
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          label="Password"
          required
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.actions}>
          <Pressable
            onPress={handleCancel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.cancelBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Button
            title="Sign up"
            onPress={handleSignUp}
            variant="secondary"
            disabled={loading}
            style={styles.signUpBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  half: { flex: 1 },
  halfInput: { marginBottom: spacing[4] },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[6],
    gap: spacing[4],
  },
  cancelBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    fontFamily: typography.fontFamily.sans,
  },
  signUpBtn: { minWidth: 120 },
});
