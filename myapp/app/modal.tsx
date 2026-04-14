import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/src/i18n';

export default function ModalScreen() {
  const { language } = useLanguage();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">
        {language === 'ar' ? 'هذه نافذة منبثقة' : 'Ceci est une fenêtre modale'}
      </ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">
          {language === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Retour à l\'accueil'}
        </ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
