import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import {
  atelier,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PANEL_RADIUS = 28;
const PRESS_SCALE = 0.96;

function GoogleIcon() {
  return <FontAwesome name="google" size={20} color={atelier.ctaText} />;
}

export type UserLoginProps = {
  /** Called when user closes the modal (X or Continue to home) — continue as guest. */
  onClose: () => void;
  /** Called when user successfully logs in or signs up. */
  onSuccess?: () => void;
};

export function UserLogin({ onClose, onSuccess }: UserLoginProps) {
  const insets = useSafeAreaInsets();
  const { login, setAuthenticated } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await login();
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!showEmailForm) {
      setShowEmailForm(true);
      return;
    }
    setLoading(true);
    try {
      await login();
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async () => {
    setLoading(true);
    try {
      await login();
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToHome = () => {
    setAuthenticated(true);
    onClose();
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Full-bleed: blurred feed + dark base + vignette */}
      <BlurView intensity={72} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.backdropBase} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]}
        locations={[0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={onClose}
          hitSlop={16}
          style={({ pressed }) => [
            styles.closeBtnWrap,
            {
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? PRESS_SCALE : 1 }],
            },
          ]}
          accessibilityLabel="Close"
        >
          <BlurView intensity={56} tint="dark" style={styles.closeBtnBlur} />
          <View style={styles.closeBtnOverlay} />
          <View style={styles.closeBtn}>
            <FontAwesome name="times" size={20} color={atelier.cta} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <BlurView
            intensity={48}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.panelRadius]}
          />
          <View style={[styles.panelOverlay, styles.panelRadius]} />
          <View style={[styles.panelGlow, styles.panelRadius]} />
          <View style={styles.panelContent}>
            <View style={styles.logoWrap}>
              <Image
                source={require("../assets/logos/favicon-wh.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Desynar"
              />
            </View>

            {mode === "login" ? (
              <>
                <Text style={styles.brand}>DESYNAR</Text>
                <Text style={styles.tagline}>
                  Curated tailoring. Elevated presence.
                </Text>
                <Text style={styles.signInLabel}>Sign in to continue</Text>

                <Pressable
                  onPress={handleGoogle}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.ctaPrimary,
                    {
                      transform: [
                        { scale: pressed && !loading ? PRESS_SCALE : 1 },
                      ],
                    },
                  ]}
                >
                  {loading ? (
                    <Text style={styles.ctaPrimaryText}>Signing in…</Text>
                  ) : (
                    <>
                      <GoogleIcon />
                      <Text style={styles.ctaPrimaryText}>
                        Continue with Google
                      </Text>
                    </>
                  )}
                </Pressable>

                <Divider
                  text="or"
                  containerStyle={styles.dividerWrap}
                  textStyle={styles.dividerText}
                  lineStyle={styles.dividerLine}
                />

                <Pressable
                  onPress={handleEmailLogin}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.ctaSecondary,
                    {
                      transform: [
                        { scale: pressed && !loading ? PRESS_SCALE : 1 },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.ctaSecondaryText}>
                    Sign in with Email
                  </Text>
                </Pressable>

                {showEmailForm && (
                  <View style={styles.emailForm}>
                    <Input
                      variant="dark"
                      label="Email"
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      containerStyle={styles.inputSpacing}
                    />
                    <Input
                      variant="dark"
                      label="Password"
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      containerStyle={styles.inputSpacing}
                    />
                    <Pressable
                      onPress={handleEmailLogin}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaPrimary,
                        styles.emailSubmitBtn,
                        {
                          transform: [
                            { scale: pressed && !loading ? PRESS_SCALE : 1 },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.ctaPrimaryText}>Sign in</Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={handleContinueToHome}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.continueToHome}>Continue to home</Text>
                </Pressable>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>New to Desynar? </Text>
                  <Pressable
                    onPress={() => setMode("signup")}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <Text style={styles.footerLink}>Create your account →</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.brand}>DESYNAR</Text>
                <Text style={styles.tagline}>Create your account</Text>
                <Text style={styles.signInLabel}>Join the atelier</Text>

                <Pressable
                  onPress={handleGoogle}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.ctaPrimary,
                    {
                      transform: [
                        { scale: pressed && !loading ? PRESS_SCALE : 1 },
                      ],
                    },
                  ]}
                >
                  <GoogleIcon />
                  <Text style={styles.ctaPrimaryText}>
                    Continue with Google
                  </Text>
                </Pressable>

                <Divider
                  text="or"
                  containerStyle={styles.dividerWrap}
                  textStyle={styles.dividerText}
                  lineStyle={styles.dividerLine}
                />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Input
                      variant="dark"
                      label="First name"
                      placeholder="First name"
                      value={firstName}
                      onChangeText={setFirstName}
                      containerStyle={[styles.inputSpacing, styles.halfInput]}
                    />
                  </View>
                  <View style={styles.half}>
                    <Input
                      variant="dark"
                      label="Last name"
                      placeholder="Last name"
                      value={lastName}
                      onChangeText={setLastName}
                      containerStyle={[styles.inputSpacing, styles.halfInput]}
                    />
                  </View>
                </View>
                <Input
                  variant="dark"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.inputSpacing}
                />
                <Input
                  variant="dark"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  containerStyle={styles.inputSpacing}
                />

                <Pressable
                  onPress={handleSignUpSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.ctaPrimary,
                    styles.signUpBtn,
                    {
                      transform: [
                        { scale: pressed && !loading ? PRESS_SCALE : 1 },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.ctaPrimaryText}>Create account</Text>
                </Pressable>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Already have an account?{" "}
                  </Text>
                  <Pressable
                    onPress={() => setMode("login")}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <Text style={styles.footerLink}>Sign in →</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdropBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: atelier.backgroundOverlay,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerSpacer: { flex: 1 },
  closeBtnWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    ...shadows.medium,
  },
  closeBtnBlur: { ...StyleSheet.absoluteFillObject, borderRadius: radius.full },
  closeBtnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: atelier.panel,
    borderRadius: radius.full,
  },
  closeBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[12],
    justifyContent: "center",
    minHeight: "100%",
  },
  panel: {
    borderRadius: PANEL_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    ...shadows.large,
  },
  panelRadius: { borderRadius: PANEL_RADIUS },
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: atelier.panel,
  },
  panelGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: atelier.panelGlow,
  },
  panelContent: { padding: spacing[8] },
  logoWrap: { alignItems: "center", marginBottom: spacing[5] },
  logo: { height: 36, width: 120 },
  brand: {
    fontSize: 28,
    fontFamily: typography.fontFamily.extraBold,
    color: atelier.cta,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.light,
    color: atelier.muted,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: spacing[6],
  },
  signInLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    textAlign: "center",
    marginBottom: spacing[6],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  ctaPrimary: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: atelier.cta,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[6],
    gap: spacing[2],
    marginBottom: spacing[4],
    ...shadows.medium,
  },
  ctaPrimaryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: atelier.ctaText,
  },
  dividerWrap: { marginVertical: spacing[4] },
  dividerText: { color: atelier.muted },
  dividerLine: { backgroundColor: atelier.divider },
  ctaSecondary: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    marginBottom: spacing[4],
  },
  ctaSecondaryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  emailForm: { marginTop: spacing[2], marginBottom: spacing[4] },
  inputSpacing: { marginBottom: spacing[4] },
  emailSubmitBtn: { marginTop: spacing[2] },
  continueToHome: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    textAlign: "center",
    marginBottom: spacing[6],
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[4],
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
  },
  footerLink: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.accent,
    textDecorationLine: "underline",
  },
  row: { flexDirection: "row", gap: spacing[4] },
  half: { flex: 1 },
  halfInput: { marginBottom: spacing[4] },
  signUpBtn: { marginTop: spacing[4] },
});
