/**
 * Chrome Storage Local 极简类型安全封装
 */
export class ExtensionStorage {
  /**
   * 读取指定 key 的存储值
   */
  static async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      const val = localStorage.getItem(key);
      return val ? (JSON.parse(val) as T) : defaultValue;
    }

    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? defaultValue;
  }

  /**
   * 写入指定 key 的存储值
   */
  static async set<T>(key: string, value: T): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    await chrome.storage.local.set({ [key]: value });
  }

  /**
   * 删除指定 key
   */
  static async remove(key: string): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      localStorage.removeItem(key);
      return;
    }

    await chrome.storage.local.remove(key);
  }

  /**
   * 监听指定 key 的值变动
   */
  static watch<T>(key: string, callback: (newValue: T, oldValue: T) => void): () => void {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
      return () => {};
    }

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[key]) {
        callback(changes[key].newValue as T, changes[key].oldValue as T);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
}

