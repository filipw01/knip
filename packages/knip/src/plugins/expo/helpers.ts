import type { PluginOptions } from '../../types/config.js';
import { type Input, toDependency, toProductionDependency } from '../../util/input.js';
import { getPackageNameFromModuleSpecifier } from '../../util/modules.js';
import type { ExpoConfig } from './types.js';

// https://docs.expo.dev/versions/latest/config/app

export const getDependencies = async (localConfig: ExpoConfig, { manifest }: PluginOptions) => {
  const expoConfig = typeof localConfig === 'function' ? localConfig() : localConfig;
  const config = 'expo' in expoConfig ? expoConfig.expo : expoConfig;

  const platforms = config.platforms ?? ['ios', 'android'];

  const pluginPackages =
    (config.plugins
      ?.map(plugin => {
        const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
        return getPackageNameFromModuleSpecifier(pluginName);
      })
      .filter(Boolean) as string[]) ?? [];

  const inputs = new Set<Input>(pluginPackages.map(id => toDependency(id)));

  const allowedPackages = ['expo-atlas', 'expo-dev-client'];
  const allowedProductionPackages = ['expo-insights'];

  const manifestDependencies = Object.keys(manifest.dependencies ?? {});

  for (const pkg of allowedPackages) {
    if (manifestDependencies.includes(pkg)) {
      inputs.add(toDependency(pkg));
    }
  }

  for (const pkg of allowedProductionPackages) {
    if (manifestDependencies.includes(pkg)) {
      inputs.add(toProductionDependency(pkg));
    }
  }

  if (config.updates?.enabled !== false) {
    inputs.add(toProductionDependency('expo-updates'));
  }

  if (config.notification) {
    inputs.add(toProductionDependency('expo-notifications'));
  }

  const isExpoRouter = manifest.main === 'expo-router/entry';

  // https://docs.expo.dev/router/installation/#setup-entry-point
  if (isExpoRouter) {
    inputs.add(toProductionDependency('expo-router'));
  }

  // https://docs.expo.dev/workflow/web/#install-web-dependencies
  if (platforms.includes('web')) {
    inputs.add(toProductionDependency('react-native-web'));
    inputs.add(toProductionDependency('react-dom'));

    // https://github.com/expo/expo/tree/main/packages/@expo/metro-runtime
    if (!isExpoRouter) {
      inputs.add(toDependency('@expo/metro-runtime'));
    }
  }

  if (
    (platforms.includes('android') && (config.userInterfaceStyle || config.android?.userInterfaceStyle)) ||
    (platforms.includes('ios') && (config.backgroundColor || config.ios?.backgroundColor))
  ) {
    inputs.add(toProductionDependency('expo-system-ui'));
  }

  if (platforms.includes('android') && config.androidNavigationBar) {
    inputs.add(toProductionDependency('expo-navigation-bar'));
  }

  return [...inputs];
};
