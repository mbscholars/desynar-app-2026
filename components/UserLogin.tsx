import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import {
  atelier,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import {
  emailLogin,
  forgotPassword,
  getApiErrorMessage,
  isEmailVerificationError,
  registerUser,
  resendEmailVerification,
  resetPassword,
  verifyPasswordResetOTP,
  verifySentOTP,
} from "@/services/api";
import { signInWithGoogle } from "@/services/api/socialAuth";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PANEL_RADIUS = 28;
const PRESS_SCALE = 0.96;
const RESEND_COOLDOWN_SECONDS = 30;

function GoogleIcon() {
  return <FontAwesome name="google" size={20} color={atelier.ctaText} />;
}

export type UserLoginProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

type LoginView = "choice" | "email" | "otp" | "forgot";
type ForgotStep = 1 | 2 | 3;

export function UserLogin({ onClose, onSuccess }: UserLoginProps) {
  const insets = useSafeAreaInsets();
  const { login, setAuthenticated } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [loginView, setLoginView] = useState<LoginView>("choice");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>(1);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const forgotResendTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearResendTimer = useCallback(() => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    setResendCooldown(0);
  }, []);

  const clearForgotResendTimer = useCallback(() => {
    if (forgotResendTimerRef.current) {
      clearInterval(forgotResendTimerRef.current);
      forgotResendTimerRef.current = null;
    }
    setForgotResendCooldown(0);
  }, []);

  const startResendCooldown = useCallback(() => {
    clearResendTimer();
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [clearResendTimer]);

  const startForgotResendCooldown = useCallback(() => {
    clearForgotResendTimer();
    setForgotResendCooldown(RESEND_COOLDOWN_SECONDS);
    forgotResendTimerRef.current = setInterval(() => {
      setForgotResendCooldown((c) => {
        if (c <= 1) {
          if (forgotResendTimerRef.current)
            clearInterval(forgotResendTimerRef.current);
          forgotResendTimerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [clearForgotResendTimer]);

  useEffect(() => {
    return () => {
      clearResendTimer();
      clearForgotResendTimer();
    };
  }, [clearResendTimer, clearForgotResendTimer]);

  const handleGoogle = async () => {
    setLoading(true);
    setGoogleError(null);
    try {
      const token = await signInWithGoogle();
      await login(token);
      onSuccess?.();
    } catch (err) {
      setGoogleError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (loginView !== "email") {
      setLoginView("email");
      setEmailError(null);
      return;
    }
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail) {
      setEmailError("Please enter your email.");
      return;
    }
    if (!trimmedPassword) {
      setEmailError("Please enter your password.");
      return;
    }
    setLoading(true);
    setEmailError(null);
    try {
      const data = await emailLogin({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      await login(data.token);
      onSuccess?.();
    } catch (err) {
      if (isEmailVerificationError(err)) {
        try {
          await resendEmailVerification(trimmedEmail);
        } catch {
          // still show OTP step
        }
        setLoginView("otp");
        setOtp("");
        setOtpError(null);
        startResendCooldown();
        otpInputRef.current?.focus();
      } else {
        setEmailError(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setOtpError(null);
    try {
      const data = await verifySentOTP({
        email: email.trim(),
        verification_token: code,
      });
      await login(data.token);
      clearResendTimer();
      onSuccess?.();
    } catch (err) {
      setOtpError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setLoading(true);
    setOtpError(null);
    try {
      await resendEmailVerification(trimmedEmail);
      setOtp("");
      startResendCooldown();
      otpInputRef.current?.focus();
    } catch (err) {
      setOtpError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const goToForgotPassword = () => {
    setLoginView("forgot");
    setForgotStep(1);
    setForgotError(null);
    setEmailError(null);
  };

  const handleForgotRequest = async () => {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setForgotError(null);
    try {
      await forgotPassword({ email: trimmedEmail });
      setForgotStep(2);
      setOtp("");
      startForgotResendCooldown();
    } catch (err) {
      setForgotError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async () => {
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setForgotError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setForgotError(null);
    try {
      await verifyPasswordResetOTP({
        email: email.trim(),
        verification_token: code,
      });
      setForgotStep(3);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setForgotError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotResendCooldown > 0) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setLoading(true);
    setForgotError(null);
    try {
      await forgotPassword({ email: trimmedEmail });
      setOtp("");
      startForgotResendCooldown();
    } catch (err) {
      setForgotError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (newPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (code.length !== 6) {
      setForgotError("Verification code is required.");
      return;
    }
    setLoading(true);
    setForgotError(null);
    try {
      await resetPassword({
        email: email.trim(),
        verification_token: code,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setLoginView("email");
      setForgotStep(1);
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      clearForgotResendTimer();
    } catch (err) {
      setForgotError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedFirst) {
      setSignupError("Please enter your first name.");
      return;
    }
    if (!trimmedLast) {
      setSignupError("Please enter your last name.");
      return;
    }
    if (!trimmedEmail) {
      setSignupError("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setSignupError(null);
    try {
      await registerUser({
        email: trimmedEmail,
        password,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone: trimmedPhone || "",
      });
      setSignupSuccess(true);
      setMode("login");
      setLoginView("email");
    } catch (err) {
      setSignupError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToHome = () => {
    setAuthenticated(true);
    onClose();
  };

  const backToLoginChoice = () => {
    setLoginView("choice");
    setEmailError(null);
    setOtpError(null);
    setOtp("");
    clearResendTimer();
  };

  const backToEmailForm = () => {
    setLoginView("email");
    setOtpError(null);
    setOtp("");
    clearResendTimer();
  };

  const backToForgotStep1 = () => {
    setForgotStep(1);
    setForgotError(null);
  };
  const backToForgotStep2 = () => {
    setForgotStep(2);
    setForgotError(null);
  };

  const isOtpValid = /^\d{6}$/.test(otp.replace(/\D/g, ""));

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
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

            {/* ---------- Login mode ---------- */}
            {mode === "login" && loginView !== "forgot" ? (
              <>
                <Text style={styles.brand}>DESYNAR</Text>
                <Text style={styles.tagline}>
                  Curated tailoring. Elevated presence.
                </Text>
                <Text style={styles.signInLabel}>Sign in to continue</Text>

                {loginView === "choice" && (
                  <>
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
                    {googleError ? (
                      <Text style={styles.googleErrorText}>{googleError}</Text>
                    ) : null}
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
                  </>
                )}

                {loginView === "email" && (
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
                      error={emailError ?? undefined}
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
                      onPress={goToForgotPassword}
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                    >
                      <Text style={styles.forgotLink}>Forgot Password?</Text>
                    </Pressable>
                    {emailError ? (
                      <Text style={styles.emailErrorText}>{emailError}</Text>
                    ) : null}
                    <View style={styles.rowButtons}>
                      <Pressable
                        onPress={backToLoginChoice}
                        style={({ pressed }) => [
                          styles.ctaSecondary,
                          styles.halfBtn,
                          { opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        <Text style={styles.ctaSecondaryText}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleEmailLogin}
                        disabled={loading}
                        style={({ pressed }) => [
                          styles.ctaPrimary,
                          styles.halfBtn,
                          {
                            transform: [
                              { scale: pressed && !loading ? PRESS_SCALE : 1 },
                            ],
                          },
                        ]}
                      >
                        <Text style={styles.ctaPrimaryText}>
                          {loading ? "Signing in…" : "Sign in"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {loginView === "otp" && (
                  <View style={styles.otpForm}>
                    <FontAwesome
                      name="key"
                      size={36}
                      color={atelier.accent}
                      style={styles.otpIcon}
                    />
                    <Text style={styles.otpTitle}>Verify your email</Text>
                    <Text style={styles.otpSubtext}>
                      We sent a 6-digit code to{" "}
                      <Text style={styles.otpEmail}>{email.trim()}</Text>
                    </Text>
                    <TextInput
                      ref={otpInputRef}
                      value={otp}
                      onChangeText={(t) =>
                        setOtp(t.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      placeholderTextColor={atelier.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[
                        styles.otpInput,
                        otpError ? styles.otpInputError : undefined,
                      ]}
                    />
                    {otpError ? (
                      <Text style={styles.emailErrorText}>{otpError}</Text>
                    ) : null}
                    <View style={styles.resendRow}>
                      <Text style={styles.resendLabel}>
                        Didn't receive the code?
                      </Text>
                      <Pressable
                        onPress={handleResendOtp}
                        disabled={resendCooldown > 0 || loading}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={styles.resendBtn}>
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend code"}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.rowButtons}>
                      <Pressable
                        onPress={backToEmailForm}
                        style={({ pressed }) => [
                          styles.ctaSecondary,
                          styles.halfBtn,
                          { opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        <Text style={styles.ctaSecondaryText}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleVerifyOtp}
                        disabled={loading || !isOtpValid}
                        style={({ pressed }) => [
                          styles.ctaPrimary,
                          styles.halfBtn,
                          {
                            opacity: !isOtpValid ? 0.6 : 1,
                            transform: [{ scale: pressed ? PRESS_SCALE : 1 }],
                          },
                        ]}
                      >
                        <Text style={styles.ctaPrimaryText}>
                          {loading ? "Verifying…" : "Verify & Login"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {loginView !== "otp" && loginView !== "email" && (
                  <Pressable
                    onPress={handleContinueToHome}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.continueToHome}>Continue to home</Text>
                  </Pressable>
                )}

                {loginView === "choice" && (
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>New to Desynar? </Text>
                    <Pressable
                      onPress={() => {
                        setMode("signup");
                        setSignupError(null);
                        setSignupSuccess(false);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                    >
                      <Text style={styles.footerLink}>
                        Create your account →
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}

            {/* ---------- Forgot password flow ---------- */}
            {mode === "login" && loginView === "forgot" ? (
              <View style={styles.forgotForm}>
                <Text style={styles.forgotTitle}>Reset password</Text>
                {forgotStep === 1 && (
                  <>
                    <Text style={styles.forgotSubtext}>
                      Enter your email and we'll send a verification code.
                    </Text>
                    <Input
                      variant="dark"
                      label="Email"
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      containerStyle={styles.inputSpacing}
                      error={forgotError ?? undefined}
                    />
                    {forgotError ? (
                      <Text style={styles.emailErrorText}>{forgotError}</Text>
                    ) : null}
                    <View style={styles.rowButtons}>
                      <Pressable
                        onPress={() => {
                          setLoginView("email");
                          setForgotStep(1);
                          setForgotError(null);
                        }}
                        style={({ pressed }) => [
                          styles.ctaSecondary,
                          styles.halfBtn,
                          { opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        <Text style={styles.ctaSecondaryText}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleForgotRequest}
                        disabled={loading}
                        style={({ pressed }) => [
                          styles.ctaPrimary,
                          styles.halfBtn,
                          { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] },
                        ]}
                      >
                        <Text style={styles.ctaPrimaryText}>
                          {loading ? "Sending…" : "Send code"}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
                {forgotStep === 2 && (
                  <>
                    <Text style={styles.forgotSubtext}>
                      Enter the 6-digit code sent to {email.trim()}
                    </Text>
                    <TextInput
                      value={otp}
                      onChangeText={(t) =>
                        setOtp(t.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      placeholderTextColor={atelier.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[
                        styles.otpInput,
                        forgotError ? styles.otpInputError : undefined,
                      ]}
                    />
                    {forgotError ? (
                      <Text style={styles.emailErrorText}>{forgotError}</Text>
                    ) : null}
                    <View style={styles.resendRow}>
                      <Pressable
                        onPress={handleForgotResendOtp}
                        disabled={forgotResendCooldown > 0 || loading}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={styles.resendBtn}>
                          {forgotResendCooldown > 0
                            ? `Resend in ${forgotResendCooldown}s`
                            : "Resend code"}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.rowButtons}>
                      <Pressable
                        onPress={backToForgotStep1}
                        style={({ pressed }) => [
                          styles.ctaSecondary,
                          styles.halfBtn,
                          { opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        <Text style={styles.ctaSecondaryText}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleForgotVerifyOtp}
                        disabled={loading || !isOtpValid}
                        style={({ pressed }) => [
                          styles.ctaPrimary,
                          styles.halfBtn,
                          {
                            opacity: !isOtpValid ? 0.6 : 1,
                            transform: [{ scale: pressed ? PRESS_SCALE : 1 }],
                          },
                        ]}
                      >
                        <Text style={styles.ctaPrimaryText}>
                          {loading ? "Verifying…" : "Verify"}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
                {forgotStep === 3 && (
                  <>
                    <Text style={styles.forgotSubtext}>
                      Enter a new password (at least 8 characters).
                    </Text>
                    <Input
                      variant="dark"
                      label="New password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      containerStyle={styles.inputSpacing}
                    />
                    <Input
                      variant="dark"
                      label="Confirm password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      containerStyle={styles.inputSpacing}
                    />
                    {forgotError ? (
                      <Text style={styles.emailErrorText}>{forgotError}</Text>
                    ) : null}
                    <View style={styles.rowButtons}>
                      <Pressable
                        onPress={backToForgotStep2}
                        style={({ pressed }) => [
                          styles.ctaSecondary,
                          styles.halfBtn,
                          { opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        <Text style={styles.ctaSecondaryText}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleResetPassword}
                        disabled={
                          loading ||
                          newPassword.length < 8 ||
                          newPassword !== confirmPassword
                        }
                        style={({ pressed }) => [
                          styles.ctaPrimary,
                          styles.halfBtn,
                          { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] },
                        ]}
                      >
                        <Text style={styles.ctaPrimaryText}>
                          {loading ? "Resetting…" : "Reset password"}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            ) : null}

            {/* ---------- Signup mode ---------- */}
            {mode === "signup" ? (
              <>
                <Text style={styles.brand}>DESYNAR</Text>
                <Text style={styles.tagline}>Create your account</Text>
                <Text style={styles.signInLabel}>Join the atelier</Text>
                {signupSuccess ? (
                  <Text style={styles.successText}>
                    Account created. Sign in with your email below.
                  </Text>
                ) : null}
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
                {googleError ? (
                  <Text style={styles.googleErrorText}>{googleError}</Text>
                ) : null}
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
                  label="Phone (optional)"
                  placeholder="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  containerStyle={styles.inputSpacing}
                />
                <Input
                  variant="dark"
                  label="Password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  containerStyle={styles.inputSpacing}
                />
                {signupError ? (
                  <Text style={styles.emailErrorText}>{signupError}</Text>
                ) : null}
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
                  <Text style={styles.ctaPrimaryText}>
                    {loading ? "Creating account…" : "Create account"}
                  </Text>
                </Pressable>
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Already have an account?{" "}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setMode("login");
                      setLoginView("choice");
                      setSignupError(null);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <Text style={styles.footerLink}>Sign in →</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
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
  googleErrorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: colors.danger[500],
    marginTop: spacing[2],
    marginBottom: spacing[1],
    textAlign: "center",
  },
  emailErrorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: colors.danger[500],
    marginTop: spacing[2],
    marginBottom: spacing[2],
    textAlign: "center",
  },
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
  forgotLink: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.accent,
    marginBottom: spacing[2],
  },
  rowButtons: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[2],
  },
  halfBtn: { flex: 1, marginBottom: 0 },
  otpForm: { marginTop: spacing[2], marginBottom: spacing[4] },
  otpIcon: { alignSelf: "center", marginBottom: spacing[3] },
  otpTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  otpSubtext: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  otpEmail: { fontFamily: typography.fontFamily.semibold, color: atelier.cta },
  otpInput: {
    height: 52,
    borderWidth: 1,
    borderColor: atelier.divider,
    borderRadius: radius.lg,
    backgroundColor: atelier.panel,
    color: atelier.cta,
    fontSize: 24,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: spacing[2],
  },
  otpInputError: {
    borderColor: colors.danger[500],
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  resendLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    marginRight: spacing[2],
  },
  resendBtn: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.accent,
  },
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
  forgotForm: { marginTop: spacing[2] },
  forgotTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: atelier.cta,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  forgotSubtext: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  successText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: colors.success[500],
    textAlign: "center",
    marginBottom: spacing[4],
  },
});
