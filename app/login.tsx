import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
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
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing, typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURE_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const FEATURE_CARD_MARGIN = spacing[4];

type FeatureItem = {
  id: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  description: string;
};

const FEATURES: FeatureItem[] = [
  {
    id: '1',
    icon: 'scissors',
    title: 'Custom fit',
    description: 'Garments made to your measurements for a perfect fit every time.',
  },
  {
    id: '2',
    icon: 'star',
    title: 'Designer pieces',
    description: 'Curated styles from talented tailors and designers.',
  },
  {
    id: '3',
    icon: 'truck',
    title: 'Fast delivery',
    description: 'From order to your door with tracking and care.',
  },
];

function GoogleIcon() {
  return (
    <FontAwesome name="google" size={20} color={colors.gray[800]} />
  );
}

function FeatureCard({ item }: { item: FeatureItem }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>
        <FontAwesome name={item.icon} size={28} color={colors.primary[500]} />
      </View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureDesc}>{item.description}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await login();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setLoading(true);
    try {
      await login();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => router.push('/signup');

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
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/logos/desynar-black.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Desynar"
          />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>

        <Button
          title="Login with Google"
          onPress={handleGoogle}
          variant="outline"
          fullWidth
          leftIcon={<GoogleIcon />}
          disabled={loading}
        />

        <Divider text="or" />

        <Button
          title="Login with Email"
          onPress={handleEmail}
          variant="outline"
          fullWidth
          disabled={loading}
        />

        <View style={styles.carouselSection}>
          <Text style={styles.carouselHeading}>Why Desynar</Text>
          <FlatList
            data={FEATURES}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={FEATURE_CARD_WIDTH + FEATURE_CARD_MARGIN * 2}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            style={styles.carouselList}
            renderItem={({ item }) => (
              <View style={[styles.featureCardWrap, { width: FEATURE_CARD_WIDTH }]}>
                <FeatureCard item={item} />
              </View>
            )}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Not registered? </Text>
          <Pressable
            onPress={handleSignUp}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={styles.link}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[10],
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logo: {
    height: 40,
    width: 140,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: colors.gray[600],
    marginBottom: spacing[8],
  },
  carouselSection: {
    marginTop: spacing[10],
  },
  carouselHeading: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.gray[900],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[1],
  },
  carouselList: {
    flexGrow: 0,
    height: 180,
  },
  carouselContent: {
    paddingLeft: spacing[4],
    paddingRight: spacing[6],
    paddingVertical: spacing[2],
  },
  featureCardWrap: {
    marginHorizontal: FEATURE_CARD_MARGIN,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.gray[200],
    minHeight: 140,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  featureTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.gray[900],
    marginBottom: spacing[2],
  },
  featureDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: colors.gray[600],
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[10],
  },
  footerText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.sans,
  },
  link: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
});
