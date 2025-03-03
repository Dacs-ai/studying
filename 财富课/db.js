class CourseDB {
    constructor() {
        this.dbName = 'CourseDatabase';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建图片存储
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'id' });
                }
                
                // 创建课程数据存储
                if (!db.objectStoreNames.contains('courses')) {
                    db.createObjectStore('courses', { keyPath: 'id' });
                }
            };
        });
    }

    async saveImage(courseId, imageBlob) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            const request = store.put({
                id: `mindmap_${courseId}`,
                data: imageBlob,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getImage(courseId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            
            const request = store.get(`mindmap_${courseId}`);

            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => reject(request.error);
        });
    }

    async saveCourse(courseData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['courses'], 'readwrite');
            const store = transaction.objectStore('courses');
            
            const request = store.put({
                id: courseData.id,
                data: courseData,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// 创建数据库实例
const courseDB = new CourseDB(); 