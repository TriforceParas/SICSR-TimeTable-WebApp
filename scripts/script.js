// SICSR Timetable Web Application
// Replicates the Android app functionality

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://time-table.sicsr.ac.in/report.php',
    // Multiple CORS proxies for fallback
    CORS_PROXIES: [
        { url: 'https://api.allorigins.win/get?url=', type: 'json', field: 'contents' },
        { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'text' },
        { url: 'https://corsproxy.org/?', type: 'text' },
    ],
    TIMEOUT: 15000,
    MAX_RETRIES: 2
};

// Current proxy index
let currentProxyIndex = 0;

// HTTP Helper Class
class HttpClient {
    static async get(url) {
        const totalAttempts = API_CONFIG.CORS_PROXIES.length * API_CONFIG.MAX_RETRIES;
        let lastError;

        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            const proxy = API_CONFIG.CORS_PROXIES[currentProxyIndex];
            
            try {
                const proxiedUrl = proxy.url + encodeURIComponent(url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

                const response = await fetch(proxiedUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                let data;
                if (proxy.type === 'json') {
                    const json = await response.json();
                    data = json[proxy.field];
                } else {
                    data = await response.text();
                }

                if (!data || data.length < 50) throw new Error('Empty response');
                
                console.log(`✓ Fetched via ${proxy.url}`);
                return data;
            } catch (error) {
                lastError = error;
                console.warn(`Proxy ${currentProxyIndex + 1} failed:`, error.message);
                currentProxyIndex = (currentProxyIndex + 1) % API_CONFIG.CORS_PROXIES.length;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        throw new Error('All proxies failed: ' + lastError.message);
    }
}

// Timetable Manager - Replicates Timetable.java
class TimetableManager {
    constructor() {
        this.batches = new Map();
        this.selectedBatches = new Map();
    }

    // Load batches - try from server first, fallback to cached
    async loadBatches() {
        try {
            const html = await HttpClient.get(API_CONFIG.BASE_URL);
            // Target the typematch select specifically
            const pattern = /<option value="([a-zA-Z])">([^<]+)<\/option>/g;
            let match;
            let count = 0;

            while ((match = pattern.exec(html)) !== null) {
                const value = match[1];
                const name = match[2];
                // Skip placeholder options like "type.o", "type.p", etc.
                if (!name.startsWith('type.')) {
                    this.batches.set(name, { name, value });
                    count++;
                }
            }

            if (count > 0) {
                console.log(`✓ Loaded ${count} batches from server`);
                // Cache batches to localStorage for offline fallback
                this.cacheBatches();
                return this.batches;
            }
            throw new Error('No batches found in response');
        } catch (error) {
            console.warn('Failed to load batches from server:', error.message);
            
            // Try to load from cache
            if (this.loadCachedBatches()) {
                console.log(`✓ Loaded ${this.batches.size} batches from cache`);
                return this.batches;
            }
            
            // No cache available - throw error
            throw new Error('Could not load batches. Please check your internet connection.');
        }
    }

    // Cache batches to localStorage
    cacheBatches() {
        try {
            const batchArray = Array.from(this.batches.values());
            localStorage.setItem('cachedBatches', JSON.stringify(batchArray));
            localStorage.setItem('cachedBatchesTimestamp', Date.now().toString());
            console.log(`✓ Cached ${batchArray.length} batches`);
        } catch (error) {
            console.warn('Failed to cache batches:', error);
        }
    }

    // Load batches from localStorage cache
    loadCachedBatches() {
        try {
            const cached = localStorage.getItem('cachedBatches');
            if (!cached) return false;

            const batchArray = JSON.parse(cached);
            if (!Array.isArray(batchArray) || batchArray.length === 0) return false;

            batchArray.forEach(batch => {
                this.batches.set(batch.name, { name: batch.name, value: batch.value });
            });

            // Show when cache was last updated
            const timestamp = localStorage.getItem('cachedBatchesTimestamp');
            if (timestamp) {
                const date = new Date(parseInt(timestamp));
                console.log(`Cache from: ${date.toLocaleDateString()}`);
            }

            return true;
        } catch (error) {
            console.warn('Failed to load cached batches:', error);
            return false;
        }
    }

    // Load selected batches from localStorage
    loadSelectedBatches() {
        try {
            const saved = localStorage.getItem('selectedBatches');
            if (saved) {
                const selectedNames = JSON.parse(saved);
                selectedNames.forEach(name => {
                    const batch = this.batches.get(name);
                    if (batch) {
                        this.selectedBatches.set(name, batch);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load saved batches:', error);
        }
    }

    // Save selected batches to localStorage
    saveSelectedBatches() {
        const selectedNames = Array.from(this.selectedBatches.keys());
        localStorage.setItem('selectedBatches', JSON.stringify(selectedNames));
    }

    // Get courses for selected batches and date - replicates Batch.getCourses()
    async getCourses(date) {
        if (this.selectedBatches.size === 0) {
            return [this.createNoBatchSelectedCourse()];
        }

        try {
            const url = this.buildCoursesUrl(date);
            const response = await HttpClient.get(url);

            const lines = response.split(/\r?\n/);
            if (lines.length <= 1) {
                return [this.createEmptyCourse()];
            }

            const courses = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const course = this.parseCourseFromCsv(line);
                if (course) courses.push(course);
            }

            return courses.length > 0 ? courses : [this.createEmptyCourse()];
        } catch (error) {
            console.error('Failed to load courses:', error);
            return [this.createErrorCourse()];
        }
    }

    // Build URL for fetching courses
    buildCoursesUrl(date) {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        let url = `${API_CONFIG.BASE_URL}?from_day=${day}&from_month=${month}&from_year=${year}`;
        url += `&to_day=${day}&to_month=${month}&to_year=${year}`;
        url += '&match_confirmed=1&output=0&output_format=1&sortby=s&sumby=t&phase=2&datatable=1';

        this.selectedBatches.forEach(batch => {
            url += `&typematch[]=${batch.value}`;
        });

        return url;
    }

    // Parse course data from CSV line
    parseCourseFromCsv(line) {
        try {
            // CSV parsing with quoted fields
            const fields = this.parseCSVLine(line);
            if (fields.length < 7) return null;

            const description = fields[6];
            const room = fields[2];
            const startTime = fields[3].split('-')[0];
            const endTime = fields[4].split('-')[0];

            return {
                description,
                room,
                startTime: this.formatTime(startTime),
                endTime: this.formatTime(endTime)
            };
        } catch (error) {
            console.error('Failed to parse course:', error);
            return null;
        }
    }

    // Parse CSV line handling quoted fields
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    // Convert 24-hour time to 12-hour format
    formatTime(time) {
        try {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            return `${displayHour}:${minutes} ${period}`;
        } catch (error) {
            return time;
        }
    }

    // Create empty course placeholder
    createEmptyCourse() {
        return {
            description: 'No Classes Scheduled',
            room: '-',
            startTime: '-',
            endTime: '-',
            isEmpty: true
        };
    }

    // Create placeholder when no batch selected
    createNoBatchSelectedCourse() {
        return {
            description: 'Please select a batch',
            room: '-',
            startTime: '-',
            endTime: '-',
            isNoBatch: true
        };
    }

    // Create error placeholder
    createErrorCourse() {
        return {
            description: 'Failed to load - tap to retry',
            room: '-',
            startTime: '-',
            endTime: '-',
            isError: true
        };
    }
}

// UI Manager - Replicates Activity.java
class UIManager {
    constructor() {
        this.timetableManager = new TimetableManager();
        this.currentDate = new Date();

        this.initializeElements();
        this.initialize();
    }

    initializeElements() {
        // Screens
        this.loadingScreen = document.getElementById('loadingScreen');
        this.mainContent = document.getElementById('mainContent');

        // Buttons
        this.selectBatchBtn = document.getElementById('selectBatchBtn');
        this.jumpToDateBtn = document.getElementById('jumpToDateBtn');
        this.yesterdayBtn = document.getElementById('yesterdayBtn');
        this.tomorrowBtn = document.getElementById('tomorrowBtn');
        this.saveBatchesBtn = document.getElementById('saveBatchesBtn');
        this.selectDateBtn = document.getElementById('selectDateBtn');

        // Displays
        this.currentDateDisplay = document.getElementById('currentDate');
        this.coursesProgress = document.getElementById('coursesProgress');
        this.coursesList = document.getElementById('coursesList');
        this.batchSelection = document.getElementById('batchSelection');

        // Modals
        this.batchModal = document.getElementById('batchModal');
        this.dateModal = document.getElementById('dateModal');
        this.datePicker = document.getElementById('datePicker');
        this.timeline = document.getElementById('timeline');

        // Close buttons
        document.querySelector('.close').addEventListener('click', () => this.closeBatchModal());
        document.querySelector('.close-date').addEventListener('click', () => this.closeDateModal());
    }

    async initialize() {
        try {
            // Load batches
            await this.timetableManager.loadBatches();
            this.timetableManager.loadSelectedBatches();

            // Setup UI
            this.renderBatchSelection();
            this.setupEventListeners();
            this.updateDateDisplay();

            // Show main content
            this.loadingScreen.style.display = 'none';
            this.mainContent.style.display = 'block';
            this.timeline.style.display = 'flex'; // Show timeline navigation

            // Load initial courses
            await this.loadCourses();
        } catch (error) {
            console.error('Initialization failed:', error);
            // Show error with retry button in loading screen
            this.loadingScreen.innerHTML = `
                <div class="error-state">
                    <h3>Connection Error</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    setupEventListeners() {
        this.selectBatchBtn.addEventListener('click', () => this.openBatchModal());
        this.jumpToDateBtn.addEventListener('click', () => this.openDateModal());
        this.yesterdayBtn.addEventListener('click', () => this.offsetDay(-1));
        this.tomorrowBtn.addEventListener('click', () => this.offsetDay(1));
        this.saveBatchesBtn.addEventListener('click', () => this.saveBatches());
        this.selectDateBtn.addEventListener('click', () => this.selectDate());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.batchModal) this.closeBatchModal();
            if (e.target === this.dateModal) this.closeDateModal();
        });
    }

    renderBatchSelection() {
        this.batchSelection.innerHTML = '';

        this.timetableManager.batches.forEach((batch, name) => {
            const item = document.createElement('div');
            item.className = 'batch-item';

            const isSelected = this.timetableManager.selectedBatches.has(name);
            if (isSelected) {
                item.classList.add('selected');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `batch-${name}`;
            checkbox.checked = isSelected;

            const label = document.createElement('label');
            label.htmlFor = `batch-${name}`;
            label.textContent = name;

            item.appendChild(checkbox);
            item.appendChild(label);

            // Make entire item clickable
            item.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });

            this.batchSelection.appendChild(item);
        });
    }

    openBatchModal() {
        this.batchModal.style.display = 'block';
    }

    closeBatchModal() {
        this.batchModal.style.display = 'none';
    }

    openDateModal() {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        this.datePicker.value = dateStr;
        this.dateModal.style.display = 'block';
    }

    closeDateModal() {
        this.dateModal.style.display = 'none';
    }

    async saveBatches() {
        // Update selected batches
        this.timetableManager.selectedBatches.clear();

        this.timetableManager.batches.forEach((batch, name) => {
            const checkbox = document.getElementById(`batch-${name}`);
            if (checkbox && checkbox.checked) {
                this.timetableManager.selectedBatches.set(name, batch);
            }
        });

        this.timetableManager.saveSelectedBatches();
        this.closeBatchModal();
        await this.loadCourses();
    }

    selectDate() {
        const selectedDate = new Date(this.datePicker.value);
        if (selectedDate) {
            this.currentDate = selectedDate;
            this.updateDateDisplay();
            this.closeDateModal();
            this.loadCourses();
        }
    }

    offsetDay(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this.updateDateDisplay();
        this.loadCourses();
    }

    updateDateDisplay() {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const formatted = this.currentDate.toLocaleDateString('en-US', options);
        this.currentDateDisplay.textContent = formatted;
    }

    async loadCourses() {
        this.setButtonsEnabled(false);
        this.coursesProgress.style.display = 'flex';
        this.coursesList.style.display = 'none';

        try {
            const courses = await this.timetableManager.getCourses(this.currentDate);
            this.renderCourses(courses);
        } catch (error) {
            console.error('Failed to load courses:', error);
            this.showError('Failed to load courses. Please try again.');
        } finally {
            this.coursesProgress.style.display = 'none';
            this.coursesList.style.display = 'block';
            this.setButtonsEnabled(true);
        }
    }

    renderCourses(courses) {
        this.coursesList.innerHTML = '';

        // Handle special states
        if (courses.length === 1) {
            const course = courses[0];
            if (course.isEmpty || course.isNoBatch || course.isError) {
                const empty = document.createElement('div');
                empty.className = 'empty-state';
                
                if (course.isNoBatch) {
                    empty.innerHTML = `
                        <h3>No Batch Selected</h3>
                        <p>Please select one or more batches to view the timetable.</p>
                    `;
                } else if (course.isError) {
                    empty.innerHTML = `
                        <h3>Connection Error</h3>
                        <p>Failed to load timetable. Please check your connection and try again.</p>
                    `;
                } else {
                    empty.innerHTML = `
                        <h3>No Classes Found</h3>
                        <p>There are no classes scheduled for this day.</p>
                    `;
                }
                this.coursesList.appendChild(empty);
                return;
            }
        }

        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';

            card.innerHTML = `
                <div class="course-name">${this.escapeHtml(course.description)}</div>
                <div class="course-details">
                    <div class="course-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M13 4h3a2 2 0 0 1 2 2v14"/>
                            <path d="M2 20h3"/>
                            <path d="M13 20h9"/>
                            <path d="M10 12v.01"/>
                            <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>
                        </svg>
                        <span>${this.escapeHtml(course.room)}</span>
                    </div>
                    <div class="course-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${this.escapeHtml(course.startTime)} - ${this.escapeHtml(course.endTime)}</span>
                    </div>
                </div>
            `;

            this.coursesList.appendChild(card);
        });
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setButtonsEnabled(enabled) {
        this.selectBatchBtn.disabled = !enabled;
        this.jumpToDateBtn.disabled = !enabled;
        this.yesterdayBtn.disabled = !enabled;
        this.tomorrowBtn.disabled = !enabled;
    }

    showError(message) {
        alert(message);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});
