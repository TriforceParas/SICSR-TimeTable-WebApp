// SICSR Timetable Web Application
// Replicates the Android app functionality

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://time-table.sicsr.ac.in/report.php',
    // Multiple CORS proxies for fallback (ordered by reliability)
    CORS_PROXIES: [
        { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'text' },
        { url: 'https://corsproxy.io/?', type: 'text' },
        { url: 'https://api.allorigins.win/get?url=', type: 'json', field: 'contents' },
    ],
    TIMEOUT: 30000,
    MAX_RETRIES: 3
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

    // Load batches - cache-first, background refresh
    async loadBatches() {
        // Step 1: Try to load from cache immediately for instant UI
        const hasCachedData = this.loadCachedBatches();

        if (hasCachedData) {
            console.log(`✓ Loaded ${this.batches.size} batches from cache (instant)`);

            // Step 2: Refresh from server in background (for next time)
            this.refreshBatchesInBackground();

            return this.batches;
        }

        // No cache - must fetch from server (first time user)
        console.log('No cache found, fetching from server...');
        return await this.fetchBatchesFromServer();
    }

    // Background refresh - doesn't block UI
    refreshBatchesInBackground() {
        // Use setTimeout to ensure this runs after the current execution
        setTimeout(async () => {
            try {
                console.log('Background: Refreshing batches from server...');
                await this.fetchBatchesFromServer();
                console.log('✓ Background refresh complete');
            } catch (error) {
                console.warn('Background refresh failed (will use cached data):', error.message);
            }
        }, 100);
    }

    // Actually fetch batches from server
    async fetchBatchesFromServer() {
        const html = await HttpClient.get(API_CONFIG.BASE_URL);

        // Parse HTML response
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const select = doc.getElementById('typematch');

        if (!select) throw new Error('Batch selection list not found');

        const options = select.getElementsByTagName('option');
        let count = 0;

        // Clear and reload batches
        this.batches.clear();

        for (const option of options) {
            const value = option.value;
            const name = option.textContent.trim();

            // Skip placeholder options like "type.o", "type.p", etc.
            if (value && name && !name.startsWith('type.') && name !== 'Common Batch' && name !== 'BREAK') {
                this.batches.set(name, { name, value });
                count++;
            }
        }

        if (count > 0) {
            console.log(`✓ Loaded ${count} batches from server`);
            // Cache batches to localStorage for next time
            this.cacheBatches();
            return this.batches;
        }
        throw new Error('No valid batches found');
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
                const selectedData = JSON.parse(saved);

                // Handle both old format (array of names) and new format (array of objects)
                selectedData.forEach(item => {
                    if (typeof item === 'string') {
                        // Old format: just batch name - try to find in batches Map
                        const batch = this.batches.get(item);
                        if (batch) {
                            this.selectedBatches.set(item, batch);
                        }
                    } else if (item && item.name && item.value) {
                        // New format: object with name and value
                        // First try to find in batches Map (in case value changed)
                        const existingBatch = this.batches.get(item.name);
                        if (existingBatch) {
                            this.selectedBatches.set(item.name, existingBatch);
                        } else {
                            // Fallback: use the stored value directly
                            this.selectedBatches.set(item.name, { name: item.name, value: item.value });
                            // Also add to batches Map for consistency
                            this.batches.set(item.name, { name: item.name, value: item.value });
                        }
                    }
                });

                console.log(`✓ Restored ${this.selectedBatches.size} selected batches`);
            }
        } catch (error) {
            console.error('Failed to load saved batches:', error);
        }
    }

    // Save selected batches to localStorage (store both name and value)
    saveSelectedBatches() {
        const selectedBatchesArray = Array.from(this.selectedBatches.values()).map(batch => ({
            name: batch.name,
            value: batch.value
        }));
        localStorage.setItem('selectedBatches', JSON.stringify(selectedBatchesArray));
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

    // Build URL for calendar download
    buildCalendarUrl(date) {
        // Use the same params but change output_format to 2 (ICS)
        // and force confirm to match view
        const url = this.buildCoursesUrl(date);
        return url.replace('output_format=1', 'output_format=2');
    }

    async downloadCalendar(date) {
        if (this.selectedBatches.size === 0) return;

        try {
            const url = this.buildCalendarUrl(date);
            // We use direct navigation for download as it's a file attachment
            // But we need to use the proxy if we want to download it programmatically
            // However, for ICS files, usually opening the link is enough if the server sends correct headers.
            // Since we use proxies for everything else, let's fetch the blob and download it to be safe across CORS.

            const content = await HttpClient.get(url);

            // Create blob and download link
            const blob = new Blob([content], { type: 'text/calendar' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `SICSR_Timetable_${date.toISOString().split('T')[0]}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            console.log('✓ Calendar downloaded');
            return true;
        } catch (error) {
            console.error('Failed to download calendar:', error);
            throw error;
        }
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
        this.saveBatchesBtn = document.getElementById('saveBatchesBtn');
        this.selectDateBtn = document.getElementById('selectDateBtn');
        this.downloadCalendarBtn = document.getElementById('downloadCalendarBtn');

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

        this.selectDateBtn.addEventListener('click', () => this.selectDate());

        // Batch Search
        const searchInput = document.getElementById('batchSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterBatches(e.target.value));
        }

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

    filterBatches(query) {
        const searchTerm = query.toLowerCase().trim();
        const items = this.batchSelection.getElementsByClassName('batch-item');

        Array.from(items).forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            if (label.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
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
        const dateKey = this.getDateKey(this.currentDate);

        // Step 1: Try to load from cache immediately for instant UI
        const cachedCourses = this.loadCachedTimetable(dateKey);

        if (cachedCourses && cachedCourses.length > 0) {
            // Show cached data immediately
            this.renderCourses(cachedCourses);
            this.setButtonsEnabled(true);

            // Refresh in background
            this.refreshCoursesInBackground(dateKey);
            return;
        }

        // No cache - must fetch from server (show loading)
        this.setButtonsEnabled(false);
        this.coursesProgress.style.display = 'flex';
        this.coursesList.style.display = 'none';
        this.updateSyncStatus('syncing');

        try {
            const courses = await this.timetableManager.getCourses(this.currentDate);

            // Validate course is not error before caching
            const isError = courses.length === 1 && (courses[0].isError);
            if (!isError) {
                this.cacheTimetable(dateKey, courses);
                this.updateSyncStatus('uptodate');
            } else {
                this.updateSyncStatus('error');
            }

            this.renderCourses(courses);
        } catch (error) {
            console.error('Failed to load courses:', error);
            this.updateSyncStatus('network');

            // Show empty state since we have no cache
            this.renderCourses([this.timetableManager.createErrorCourse()]);
        } finally {
            this.coursesProgress.style.display = 'none';
            this.coursesList.style.display = 'block';
            this.setButtonsEnabled(true);
        }
    }

    // Background refresh - doesn't block UI
    refreshCoursesInBackground(dateKey) {
        this.updateSyncStatus('syncing');

        setTimeout(async () => {
            try {
                const courses = await this.timetableManager.getCourses(this.currentDate);

                const isError = courses.length === 1 && (courses[0].isError || courses[0].isNoBatch);
                if (!isError) {
                    this.cacheTimetable(dateKey, courses);
                    // Update UI with fresh data
                    this.renderCourses(courses);
                    this.updateSyncStatus('uptodate');
                } else {
                    this.updateSyncStatus('uptodate'); // Cache is still valid
                }
            } catch (error) {
                console.warn('Background refresh failed:', error.message);
                this.updateSyncStatus('network');
            }
        }, 100);
    }

    updateSyncStatus(status) {
        const statusEl = document.getElementById('syncStatus');
        if (!statusEl) return;

        const iconEl = statusEl.querySelector('.sync-icon');
        const textEl = statusEl.querySelector('.sync-text');

        statusEl.className = 'sync-status'; // Reset classes

        switch (status) {
            case 'syncing':
                statusEl.classList.add('syncing');
                if (iconEl) iconEl.innerHTML = '<div class="sync-spinner"></div>';
                if (textEl) textEl.textContent = 'Updating...';
                break;
            case 'uptodate':
                statusEl.classList.add('uptodate');
                if (iconEl) iconEl.innerHTML = '✓';
                if (textEl) textEl.textContent = 'Up to Date';
                break;
            case 'network':
                statusEl.classList.add('network-error');
                if (iconEl) iconEl.innerHTML = '⚠';
                if (textEl) textEl.textContent = 'Network Issue';
                break;
            case 'error':
                statusEl.classList.add('backend-error');
                if (iconEl) iconEl.innerHTML = '✕';
                if (textEl) textEl.textContent = 'Backend Error';
                break;
        }
    }

    getDateKey(date) {
        return `timetable_${date.getFullYear()}_${date.getMonth()}_${date.getDate()}_${Array.from(this.timetableManager.selectedBatches.keys()).join('_')}`;
    }

    cacheTimetable(key, courses) {
        try {
            const data = JSON.stringify({
                timestamp: Date.now(),
                courses: courses
            });
            localStorage.setItem(key, data);
        } catch (e) {
            console.warn('Failed to cache timetable');
        }
    }

    loadCachedTimetable(key) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            const parsed = JSON.parse(data);
            // Verify it's not too old (optional, here we keep it indefinitely for offline use)
            return parsed.courses;
        } catch (e) {
            return null;
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
        if (this.selectBatchBtn) this.selectBatchBtn.disabled = !enabled;
        if (this.jumpToDateBtn) this.jumpToDateBtn.disabled = !enabled;
        if (this.yesterdayBtn) this.yesterdayBtn.disabled = !enabled;
        if (this.tomorrowBtn) this.tomorrowBtn.disabled = !enabled;
        if (this.downloadCalendarBtn) this.downloadCalendarBtn.disabled = !enabled;
    }

    async downloadCalendar() {
        this.downloadCalendarBtn.disabled = true;
        try {
            await this.timetableManager.downloadCalendar(this.currentDate);
        } catch (error) {
            this.showError('Failed to download calendar. Please try again.');
        } finally {
            this.downloadCalendarBtn.disabled = false;
        }
    }

    showError(message) {
        alert(message);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});
