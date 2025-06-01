// IndexedDB storage for reliable session data persistence
class IndexedDBStorage {
  private dbName = 'kasinaApp';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('diagnostics')) {
          db.createObjectStore('diagnostics', { keyPath: 'id' });
        }
      };
    });
  }

  async setItem(storeName: string, key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ id: key, data: value, timestamp: Date.now() });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getItem(storeName: string, key: string): Promise<any> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
    });
  }

  async removeItem(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllKeys(storeName: string): Promise<string[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  // Fallback to localStorage if IndexedDB fails
  async setItemSafe(storeName: string, key: string, value: any): Promise<void> {
    try {
      await this.setItem(storeName, key, value);
      console.log(`✅ IndexedDB save successful: ${storeName}/${key}`);
    } catch (error) {
      console.warn(`⚠️ IndexedDB failed, falling back to localStorage:`, error);
      try {
        localStorage.setItem(`${storeName}_${key}`, JSON.stringify(value));
        console.log(`✅ localStorage fallback successful: ${storeName}/${key}`);
      } catch (localStorageError) {
        console.error(`❌ Both IndexedDB and localStorage failed:`, localStorageError);
        throw localStorageError;
      }
    }
  }

  async getItemSafe(storeName: string, key: string): Promise<any> {
    try {
      const result = await this.getItem(storeName, key);
      if (result !== null) return result;
    } catch (error) {
      console.warn(`⚠️ IndexedDB read failed, trying localStorage:`, error);
    }
    
    try {
      const fallback = localStorage.getItem(`${storeName}_${key}`);
      return fallback ? JSON.parse(fallback) : null;
    } catch (error) {
      console.error(`❌ Both IndexedDB and localStorage read failed:`, error);
      return null;
    }
  }
}

export const storage = new IndexedDBStorage();