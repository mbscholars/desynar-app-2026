import { Text, TextProps } from './Themed';
import { typography } from '@/constants/theme';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: typography.fontFamily.sans }]} />;
}
