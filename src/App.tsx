import { useState } from 'react';
import { useTimetable } from './hooks/useTimetable';
import { CourseList } from './components/CourseList';
import { BatchModal } from './components/BatchModal';
import { DateModal } from './components/DateModal';
import { Timeline } from './components/Timeline';
import { SyncStatus } from './components/SyncStatus';

function App() {
    const {
        batches,
        selectedBatches,
        saveSelectedBatches,
        courses,
        currentDate,
        offsetDay,
        goToDate,
        isLoading,
        syncStatus
    } = useTimetable();

    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="container">
                <header>
                    <div className="header-content">
                        <svg className="header-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                            <path d="M8 7h6" />
                            <path d="M8 11h8" />
                        </svg>
                        <h1>SICSR Timetable</h1>
                    </div>
                    <p className="subtitle">Your academic schedule at a glance</p>
                </header>

                <div className="loading-screen">
                    <div className="loader">
                        <div className="loader-ring"></div>
                        <div className="loader-ring"></div>
                        <div className="loader-ring"></div>
                    </div>
                    <p>Loading batches...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container">
                <header>
                    <div className="header-content">
                        <svg className="header-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                            <path d="M8 7h6" />
                            <path d="M8 11h8" />
                        </svg>
                        <h1>SICSR Timetable</h1>
                    </div>
                    <p className="subtitle">Your academic schedule at a glance</p>
                </header>

                <div className="main-content">
                    <div className="controls">
                        <button className="btn btn-primary" onClick={() => setIsBatchModalOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>Select Batches</span>
                            <svg className="chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        <button className="btn btn-secondary" onClick={() => setIsDateModalOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                            </svg>
                            <span>{formatDate(currentDate)}</span>
                        </button>
                    </div>

                    <CourseList courses={courses} />
                    <SyncStatus status={syncStatus} />
                </div>

                <footer className="footer">
                    <p>
                        Built with
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="heart-icon">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                        by <a href="https://github.com/TriforceParas" target="_blank" rel="noopener noreferrer">TriforceParas</a>
                    </p>
                </footer>
            </div>

            <Timeline
                onYesterday={() => offsetDay(-1)}
                onTomorrow={() => offsetDay(1)}
            />

            <BatchModal
                isOpen={isBatchModalOpen}
                onClose={() => setIsBatchModalOpen(false)}
                batches={batches}
                selectedBatches={selectedBatches}
                onSave={saveSelectedBatches}
            />

            <DateModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                currentDate={currentDate}
                onSelect={goToDate}
            />
        </>
    );
}

export default App;
