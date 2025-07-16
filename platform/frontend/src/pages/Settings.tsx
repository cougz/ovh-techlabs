import React, { useState } from 'react';
import { 
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  ServerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Select from '../components/Select';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      autoCleanup: true,
      cleanupDelay: 72,
      defaultRegion: 'LIM',
      maxWorkshops: 10,
      maxAttendeesPerWorkshop: 50
    },
    notifications: {
      emailEnabled: true,
      slackEnabled: false,
      deploymentAlerts: true,
      cleanupReminders: true,
      errorNotifications: true
    },
    security: {
      sessionTimeout: 24,
      requireMFA: false,
      allowedDomains: '@techlabs.ovhcloud.com',
      auditLogging: true
    },
    terraform: {
      parallelExecutions: 5,
      stateBackend: 's3',
      retryAttempts: 3,
      timeout: 1800
    }
  });

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'terraform', name: 'Terraform', icon: ServerIcon }
  ];

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      // API call would go here
      console.log('Saving settings:', settings);
      // Show success notification
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Show error notification
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
              checked={settings.general.autoCleanup}
              onChange={(e) => handleSettingChange('general', 'autoCleanup', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cleanup delay (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.general.cleanupDelay}
              onChange={(e) => handleSettingChange('general', 'cleanupDelay', parseInt(e.target.value))}
              className="block w-20 rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Time to wait after workshop end before cleanup</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default OVH region
            </label>
            <div className="w-40">
              <Select
                value={settings.general.defaultRegion}
                onChange={(value) => handleSettingChange('general', 'defaultRegion', value)}
                options={[
                  { value: 'LIM', label: 'LIM (Limburg)' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max concurrent workshops
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.general.maxWorkshops}
                onChange={(e) => handleSettingChange('general', 'maxWorkshops', parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max attendees per workshop
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={settings.general.maxAttendeesPerWorkshop}
                onChange={(e) => handleSettingChange('general', 'maxAttendeesPerWorkshop', parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email notifications</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications via email</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.emailEnabled}
              onChange={(e) => handleSettingChange('notifications', 'emailEnabled', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slack integration</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications to Slack channels</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.slackEnabled}
              onChange={(e) => handleSettingChange('notifications', 'slackEnabled', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deployment alerts</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notify when deployments start/complete</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.deploymentAlerts}
              onChange={(e) => handleSettingChange('notifications', 'deploymentAlerts', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cleanup reminders</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Remind before automatic cleanup</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.cleanupReminders}
              onChange={(e) => handleSettingChange('notifications', 'cleanupReminders', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Error notifications</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alert on deployment failures</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.errorNotifications}
              onChange={(e) => handleSettingChange('notifications', 'errorNotifications', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Authentication & Access</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session timeout (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
              className="block w-24 rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Require Multi-Factor Authentication</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Require MFA for all users</p>
            </div>
            <input
              type="checkbox"
              checked={settings.security.requireMFA}
              onChange={(e) => handleSettingChange('security', 'requireMFA', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed email domains
            </label>
            <input
              type="text"
              value={settings.security.allowedDomains}
              onChange={(e) => handleSettingChange('security', 'allowedDomains', e.target.value)}
              placeholder="@company.com"
              className="block w-full rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comma-separated list of allowed domains</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Audit logging</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Log all user actions</p>
            </div>
            <input
              type="checkbox"
              checked={settings.security.auditLogging}
              onChange={(e) => handleSettingChange('security', 'auditLogging', e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTerraformSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Execution Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parallel executions
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.terraform.parallelExecutions}
              onChange={(e) => handleSettingChange('terraform', 'parallelExecutions', parseInt(e.target.value))}
              className="block w-24 rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Maximum concurrent Terraform operations</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              State backend
            </label>
            <div className="w-40">
              <Select
                value={settings.terraform.stateBackend}
                onChange={(value) => handleSettingChange('terraform', 'stateBackend', value)}
                options={[
                  { value: 's3', label: 'S3 Compatible' },
                  { value: 'local', label: 'Local' },
                  { value: 'remote', label: 'Terraform Cloud' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retry attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.terraform.retryAttempts}
                onChange={(e) => handleSettingChange('terraform', 'retryAttempts', parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="300"
                max="7200"
                value={settings.terraform.timeout}
                onChange={(e) => handleSettingChange('terraform', 'timeout', parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-stone-800 border border-yellow-200 dark:border-stone-600 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 dark:text-amber-400 mr-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-amber-200">Important</h4>
            <p className="text-sm text-yellow-700 dark:text-stone-200 mt-1">
              Changes to Terraform settings may affect ongoing deployments. Apply with caution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'terraform':
        return renderTerraformSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Configure application settings and preferences
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow dark:shadow-none rounded-lg">
        {/* Tab navigation */}
        <div className="border-b border-gray-200 dark:border-slate-600">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="px-6 py-6">
          {renderTabContent()}
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