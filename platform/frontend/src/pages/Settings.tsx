import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    autoCleanup: true,
    cleanupDelay: 72
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('techlabs-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('techlabs-settings', JSON.stringify(settings));
      
      // API call would go here in the future
      console.log('Saving settings:', settings);
      
      // Show success confirmation
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Workshop Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-cleanup workshops</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically delete workshop resources after completion</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCleanup}
              onChange={(e) => handleSettingChange('autoCleanup', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label htmlFor="cleanup-delay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cleanup delay (hours)
            </label>
            <input
              id="cleanup-delay"
              type="number"
              min="1"
              max="168"
              value={settings.cleanupDelay}
              onChange={(e) => handleSettingChange('cleanupDelay', parseInt(e.target.value))}
              className="block w-20 rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Time to wait after workshop end before cleanup</p>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Configure application settings and preferences
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow dark:shadow-none rounded-lg">
        {/* Content - No tabs since there's only one section */}
        <div className="px-6 py-6">
          {renderGeneralSettings()}
        </div>

        {/* Save button */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600 flex justify-end">
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;