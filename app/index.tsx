import { Redirect } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';

/** Entry gate: route to onboarding on first launch, otherwise to the app. */
export default function Index() {
  const onboarded = useSettingsStore((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
