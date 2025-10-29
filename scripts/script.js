// SICSR Timetable Web Application
// Replicates the Android app functionality

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://time-table.sicsr.ac.in/report.php',
    CORS_PROXY: 'https://api.allorigins.win/raw?url=' // CORS proxy for browser requests
};

// HTTP Helper Class - Replicates Http.java
class HttpClient {
    static async get(url) {
        const proxiedUrl = API_CONFIG.CORS_PROXY + encodeURIComponent(url);

        while (true) {
            try {
                const response = await fetch(proxiedUrl);
                if (!response.ok) throw new Error('Network error');
                return await response.text();
            } catch (error) {
                console.error('GET request failed, retrying...', error);
                await this.sleep(1000);
            }
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Timetable Manager - Replicates Timetable.java
class TimetableManager {
    constructor() {
        this.batches = new Map();
        this.selectedBatches = new Map();
    }

    // Parse batches from HTML - replicates getBatches()
    async loadBatches() {
        try {
            const html = await HttpClient.get(API_CONFIG.BASE_URL);
            const pattern = /<option value="([a-zA-Z])">([^<]+)<\/option>/g;
            let match;

            while ((match = pattern.exec(html)) !== null) {
                const value = match[1];
                const name = match[2];
                this.batches.set(name, { name, value });
            }

            return this.batches;
        } catch (error) {
            console.error('Failed to load batches:', error);
            throw error;
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
            return [this.createEmptyCourse()];
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
            return [this.createEmptyCourse()];
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
            description: '❓',
            room: '❓',
            startTime: '❓',
            endTime: '❓'
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
            this.showError('Failed to load application. Please refresh the page.');
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

        if (courses.length === 0 || (courses.length === 1 && courses[0].description === '❓')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `
                <h3>No Classes Found</h3>
                <p>There are no classes scheduled for this day.</p>
            `;
            this.coursesList.appendChild(empty);
            return;
        }

        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';

            card.innerHTML = `
                <div class="course-name">${course.description}</div>
                <div class="course-details">
                    <div class="course-detail">
                        <span>🚪</span>
                        <span>${course.room}</span>
                    </div>
                    <div class="course-detail">
                        <span>🕧</span>
                        <span>${course.startTime}</span>
                    </div>
                    <div class="course-detail">
                        <span>🕝</span>
                        <span>${course.endTime}</span>
                    </div>
                </div>
            `;

            this.coursesList.appendChild(card);
        });
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
