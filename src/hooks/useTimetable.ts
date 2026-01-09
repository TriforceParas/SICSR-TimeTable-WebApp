import { useState, useEffect, useCallback } from 'react';
import { Batch, Course, API_CONFIG } from '../types';
import { httpGet } from '../api';

const CACHE_KEY_BATCHES = 'cachedBatches';
const CACHE_KEY_SELECTED = 'selectedBatches';

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
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

function formatTime(time: string): string {
    try {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${minutes} ${period}`;
    } catch {
        return time;
    }
}

function parseCourse(line: string): Course | null {
    const fields = parseCSVLine(line);
    if (fields.length < 7) return null;
    return {
        description: fields[6],
        room: fields[2],
        startTime: formatTime(fields[3].split('-')[0]),
        endTime: formatTime(fields[4].split('-')[0])
    };
}

export function useTimetable() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatches, setSelectedBatches] = useState<Batch[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'syncing' | 'uptodate' | 'network' | 'error'>('syncing');

    // Load batches from cache or server
    useEffect(() => {
        const loadBatches = async () => {
            // Try cache first
            const cached = localStorage.getItem(CACHE_KEY_BATCHES);
            if (cached) {
                const parsed = JSON.parse(cached);
                setBatches(parsed);
                console.log(`✓ Loaded ${parsed.length} batches from cache`);
            }

            // Fetch from server (background or foreground)
            try {
                const html = await httpGet(API_CONFIG.BASE_URL);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const select = doc.getElementById('typematch');

                if (!select) throw new Error('Batch list not found');

                const options = Array.from(select.getElementsByTagName('option'));
                const newBatches: Batch[] = [];

                for (const option of options) {
                    const value = option.value;
                    const name = option.textContent?.trim();
                    if (value && name && !name.startsWith('type.') && name !== 'Common Batch' && name !== 'BREAK') {
                        newBatches.push({ name, value });
                    }
                }

                setBatches(newBatches);
                localStorage.setItem(CACHE_KEY_BATCHES, JSON.stringify(newBatches));
                console.log(`✓ Loaded ${newBatches.length} batches from server`);
            } catch (error) {
                console.warn('Failed to fetch batches:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadBatches();
    }, []);

    // Load selected batches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(CACHE_KEY_SELECTED);
        if (saved && batches.length > 0) {
            try {
                const parsed = JSON.parse(saved) as Batch[];
                setSelectedBatches(parsed);
            } catch { /* ignore */ }
        }
    }, [batches]);

    // Save selected batches
    const saveSelectedBatches = useCallback((selected: Batch[]) => {
        setSelectedBatches(selected);
        localStorage.setItem(CACHE_KEY_SELECTED, JSON.stringify(selected));
    }, []);

    // Build courses URL
    const buildCoursesUrl = useCallback((date: Date, selected: Batch[]) => {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        let url = `${API_CONFIG.BASE_URL}?from_day=${day}&from_month=${month}&from_year=${year}`;
        url += `&to_day=${day}&to_month=${month}&to_year=${year}`;
        url += '&match_confirmed=1&output=0&output_format=1&sortby=s&sumby=t&phase=2&datatable=1';

        selected.forEach(batch => {
            url += `&typematch[]=${batch.value}`;
        });

        return url;
    }, []);

    // Get cache key for a date
    const getCacheKey = useCallback((date: Date, selected: Batch[]) => {
        return `timetable_${date.getFullYear()}_${date.getMonth()}_${date.getDate()}_${selected.map(b => b.name).join('_')}`;
    }, []);

    // Fetch courses
    const fetchCourses = useCallback(async (date: Date, selected: Batch[]): Promise<Course[]> => {
        if (selected.length === 0) {
            return [{ description: 'Please select a batch', room: '-', startTime: '-', endTime: '-', isNoBatch: true }];
        }

        try {
            const url = buildCoursesUrl(date, selected);
            const response = await httpGet(url);
            const lines = response.split(/\r?\n/);

            if (lines.length <= 1) {
                return [{ description: 'No Classes Scheduled', room: '-', startTime: '-', endTime: '-', isEmpty: true }];
            }

            const parsed: Course[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const course = parseCourse(line);
                if (course) parsed.push(course);
            }

            return parsed.length > 0 ? parsed : [{ description: 'No Classes Scheduled', room: '-', startTime: '-', endTime: '-', isEmpty: true }];
        } catch {
            return [{ description: 'Failed to load - tap to retry', room: '-', startTime: '-', endTime: '-', isError: true }];
        }
    }, [buildCoursesUrl]);

    // Load courses when date or selected batches change
    useEffect(() => {
        const loadCourses = async () => {
            const cacheKey = getCacheKey(currentDate, selectedBatches);

            // Try cache first
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setCourses(parsed.courses);
                    setSyncStatus('uptodate');

                    // Background refresh
                    setTimeout(async () => {
                        setSyncStatus('syncing');
                        const fresh = await fetchCourses(currentDate, selectedBatches);
                        if (!fresh[0]?.isError) {
                            setCourses(fresh);
                            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), courses: fresh }));
                            setSyncStatus('uptodate');
                        } else {
                            setSyncStatus('network');
                        }
                    }, 100);
                    return;
                } catch { /* fall through */ }
            }

            // No cache - fetch
            setSyncStatus('syncing');
            const fresh = await fetchCourses(currentDate, selectedBatches);
            setCourses(fresh);

            if (!fresh[0]?.isError && !fresh[0]?.isNoBatch) {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), courses: fresh }));
                setSyncStatus('uptodate');
            } else if (fresh[0]?.isError) {
                setSyncStatus('error');
            } else {
                setSyncStatus('uptodate');
            }
        };

        loadCourses();
    }, [currentDate, selectedBatches, fetchCourses, getCacheKey]);

    const offsetDay = useCallback((days: number) => {
        setCurrentDate(prev => {
            const next = new Date(prev);
            next.setDate(next.getDate() + days);
            return next;
        });
    }, []);

    const goToDate = useCallback((date: Date) => {
        setCurrentDate(date);
    }, []);

    return {
        batches,
        selectedBatches,
        saveSelectedBatches,
        courses,
        currentDate,
        offsetDay,
        goToDate,
        isLoading,
        syncStatus
    };
}
