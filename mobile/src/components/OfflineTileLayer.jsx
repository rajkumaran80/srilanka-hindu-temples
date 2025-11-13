import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom TileLayer with offline caching
class OfflineTileLayer extends L.TileLayer {
  constructor(urlTemplate, options = {}) {
    super(urlTemplate, options);
    this._dbPromise = this._openDB();
    this._cache = new Map(); // In-memory cache for faster access
  }

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('mapTiles', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles');
        }
      };
    });
  }

  async _getTileFromCache(key) {
    try {
      const db = await this._dbPromise;
      const transaction = db.transaction(['tiles'], 'readonly');
      const store = transaction.objectStore('tiles');
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting tile from cache:', error);
      return null;
    }
  }

  async _saveTileToCache(key, blob) {
    try {
      const db = await this._dbPromise;
      const transaction = db.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      const request = store.put(blob, key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving tile to cache:', error);
    }
  }

  createTile(coords, done) {
    const tile = document.createElement('img');
    const url = this.getTileUrl(coords);
    const cacheKey = `${this._url.replace(/{s}/g, 'a')}-${coords.z}-${coords.x}-${coords.y}`;

    // Check in-memory cache first
    if (this._cache.has(cacheKey)) {
      const cachedBlob = this._cache.get(cacheKey);
      tile.src = URL.createObjectURL(cachedBlob);
      done(null, tile);
      return tile;
    }

    // Check IndexedDB cache
    this._getTileFromCache(cacheKey).then(cachedBlob => {
      if (cachedBlob) {
        // Found in cache
        this._cache.set(cacheKey, cachedBlob); // Add to memory cache
        tile.src = URL.createObjectURL(cachedBlob);
        done(null, tile);
      } else {
        // Not in cache, fetch from network
        fetch(url)
          .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.blob();
          })
          .then(blob => {
            // Save to cache
            this._saveTileToCache(cacheKey, blob);
            this._cache.set(cacheKey, blob); // Add to memory cache
            tile.src = URL.createObjectURL(blob);
            done(null, tile);
          })
          .catch(error => {
            console.error('Error loading tile:', error);
            done(error, tile);
          });
      }
    }).catch(error => {
      console.error('Error checking cache:', error);
      // Fallback to network
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          tile.src = URL.createObjectURL(blob);
          done(null, tile);
        })
        .catch(error => {
          done(error, tile);
        });
    });

    return tile;
  }

  // Method to preload tiles for an area
  async preloadTiles(bounds, minZoom, maxZoom) {
    const promises = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();

      const topLeft = this._map.project([northEast.lat, southWest.lng], z);
      const bottomRight = this._map.project([southWest.lat, northEast.lng], z);

      const minX = Math.floor(topLeft.x / 256);
      const maxX = Math.floor(bottomRight.x / 256);
      const minY = Math.floor(topLeft.y / 256);
      const maxY = Math.floor(bottomRight.y / 256);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const coords = { x, y, z };
          const url = this.getTileUrl(coords);
          const cacheKey = `${this._url.replace(/{s}/g, 'a')}-${z}-${x}-${y}`;

          // Check if already cached
          const cached = await this._getTileFromCache(cacheKey);
          if (!cached) {
            promises.push(
              fetch(url)
                .then(response => {
                  if (response.ok) return response.blob();
                  throw new Error('Network response was not ok');
                })
                .then(blob => this._saveTileToCache(cacheKey, blob))
                .catch(error => console.error('Error preloading tile:', error))
            );
          }
        }
      }
    }

    return Promise.all(promises);
  }

  // Method to clear cache
  async clearCache() {
    try {
      const db = await this._dbPromise;
      const transaction = db.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          this._cache.clear();
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Method to get cache size
  async getCacheSize() {
    try {
      const db = await this._dbPromise;
      const transaction = db.transaction(['tiles'], 'readonly');
      const store = transaction.objectStore('tiles');
      const request = store.count();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }
}

// React component wrapper
const OfflineTileLayerComponent = ({ url, attribution, onLayerReady, ...options }) => {
  const map = useMap();

  useEffect(() => {
    const tileLayer = new OfflineTileLayer(url, {
      attribution,
      ...options
    });

    map.addLayer(tileLayer);

    if (onLayerReady) {
      onLayerReady(tileLayer);
    }

    return () => {
      map.removeLayer(tileLayer);
    };
  }, [map, url, attribution, options, onLayerReady]);

  return null;
};

export default OfflineTileLayerComponent;
