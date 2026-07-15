import { SettingsView } from '../../components/settings/SettingsView';
import { useAppContext } from '../../context/AppContext';

export function SettingsPage() {
  const { settings, handleSettings, handleFileUpload, files } = useAppContext();
  return <SettingsView settings={settings} onSave={handleSettings} onUpload={handleFileUpload} files={files} />;
}
