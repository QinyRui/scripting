import { AppIntentManager, AppIntentProtocol, Widget } from "scripting";

const STORAGE_KEY = 'ippure.selectedFeature';

export const SelectFeatureIntent = AppIntentManager.register({
  name: "SelectFeature",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (featureId: string) => {
    const FEATURES = [
      { id: 'ip-info', title: 'IP 定位信息', url: 'https://ippure.com/' },
      { id: 'risk', title: 'IP 风险检测', url: 'https://ippure.com/' },
      { id: 'fingerprint', title: '指纹信息分析', url: 'https://ippure.com/fingerprint' },
      { id: 'outbound', title: 'IP 出口地图', url: 'https://ippure.com/IP-Outbound-Detect' },
      { id: 'vpn-leak', title: 'VPN 泄露检测', url: 'https://ippure.com/IP-leak-Detect' },
      { id: 'webrtc', title: 'WebRTC 检测', url: 'https://ippure.com/Browser-WebRTC-Leak-Detect' },
      { id: 'dns-leak', title: 'DNS 泄露检测', url: 'https://ippure.com/DNS-Leak-Detect' },
      { id: 'advanced', title: '高级检测服务', url: 'https://ippure.com/todo' }
    ];
    const feature = FEATURES.find(f => f.id === featureId);
    if (feature) {
      const data = { id: feature.id, title: feature.title, url: feature.url, updatedAt: new Date().toISOString() };
      Storage.set(STORAGE_KEY, data);
      Storage.set(STORAGE_KEY, data, { shared: true });
    }
    Widget.reloadAll();
  }
});