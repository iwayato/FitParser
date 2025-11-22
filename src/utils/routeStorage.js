// IndexedDB Storage for Bike Routes
// No dependencies needed - uses native browser IndexedDB API

const DB_NAME = 'BikeRoutesDB';
const DB_VERSION = 1;
const STORE_NAME = 'routes';

class RouteStorage {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize the database
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }
            };
        });
    }

    /**
     * Save a route to the database
     * @param {Object} routeData - Parsed FIT data from parseFitFile()
     * @param {string} fileName - Original file name
     * @returns {Promise<number>} ID of saved route
     */
    async saveRoute(routeData, fileName = 'Untitled Route') {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(routeData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all routes
     * @returns {Promise<Array>} Array of all routes
     */
    async getAllRoutes() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a specific route by ID
     * @param {number} id - Route ID
     * @returns {Promise<Object>} Route data
     */
    async getRouteById(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a route
     * @param {number} id - Route ID
     * @returns {Promise<void>}
     */
    async deleteRoute(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update route name
     * @param {number} id - Route ID
     * @param {string} newName - New route name
     * @returns {Promise<void>}
     */
    async updateRouteName(id, newName) {
        if (!this.db) await this.init();

        const route = await this.getRouteById(id);
        if (!route) throw new Error('Route not found');

        route.name = newName;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(route);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Search routes by filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Filtered routes
     */
    async searchRoutes(filters = {}) {
        const allRoutes = await this.getAllRoutes();

        return allRoutes.filter(route => {
            if (filters.sport && route.sport !== filters.sport) return false;
            if (filters.minDistance && route.distance < filters.minDistance) return false;
            if (filters.maxDistance && route.distance > filters.maxDistance) return false;
            if (filters.startDate && new Date(route.date) < new Date(filters.startDate)) return false;
            if (filters.endDate && new Date(route.date) > new Date(filters.endDate)) return false;
            if (filters.name && !route.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            return true;
        });
    }

    /**
     * Get routes sorted by date (newest first)
     * @returns {Promise<Array>}
     */
    async getRoutesSortedByDate() {
        const routes = await this.getAllRoutes();
        return routes.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        const routes = await this.getAllRoutes();
        return {
            totalRoutes: routes.length,
            totalDistance: routes.reduce((sum, r) => sum + (r.summary.totalDistance || 0), 0),
            totalMovingTime: routes.reduce((sum, r) => sum + (r.summary.totalMovingTime || 0), 0),
            totalCalories: routes.reduce((sum, r) => sum + (r.summary.totalCalories || 0), 0)
        };
    }

    /**
     * Clear all routes (use with caution!)
     * @returns {Promise<void>}
     */
    async clearAllRoutes() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Export all routes as JSON
     * @returns {Promise<string>} JSON string of all routes
     */
    async exportAllRoutes() {
        const routes = await this.getAllRoutes();
        return JSON.stringify(routes, null, 2);
    }

    /**
     * Import routes from JSON
     * @param {string} jsonData - JSON string of routes
     * @returns {Promise<number>} Number of routes imported
     */
    async importRoutes(jsonData) {
        const routes = JSON.parse(jsonData);
        let count = 0;

        for (const route of routes) {
            // Remove the id so IndexedDB generates new ones
            const { id, ...routeWithoutId } = route;
            await this.saveRoute(routeWithoutId.data, routeWithoutId.name);
            count++;
        }

        return count;
    }
}

// Create singleton instance
const routeStorage = new RouteStorage();

export default routeStorage;

// Example usage:
/*
import routeStorage from './routeStorage.js';
import { parseFitFile } from './fitParser.js';

// Save a route
const fileInput = document.getElementById('fit-file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const routeData = await parseFitFile(file);
    const id = await routeStorage.saveRoute(routeData, file.name);
    console.log('Route saved with ID:', id);
  }
});

// Get all routes
const routes = await routeStorage.getAllRoutes();
console.log('All routes:', routes);

// Get specific route
const route = await routeStorage.getRouteById(1);
console.log('Route details:', route);

// Search routes
const longRides = await routeStorage.searchRoutes({ 
  minDistance: 50,
  sport: 'cycling' 
});

// Get stats
const stats = await routeStorage.getStats();
console.log('Total distance:', stats.totalDistance);

// Delete a route
await routeStorage.deleteRoute(1);

// Export/Import
const backup = await routeStorage.exportAllRoutes();
// Save backup to file or cloud
// Later restore:
await routeStorage.importRoutes(backup);
*/