import { Image } from 'expo-image';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  return (
    <Image
      source={`sf:${name}`}
      contentFit="contain"
      style={[
        {
          width: size,
          height: size,
          tintColor: color,
        },
        style,
      ]}
    />
  );
}
