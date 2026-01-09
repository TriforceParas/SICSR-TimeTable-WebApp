import { Course } from '../types';

interface CourseListProps {
    courses: Course[];
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function CourseList({ courses }: CourseListProps) {
    // Handle special states
    if (courses.length === 1) {
        const course = courses[0];
        if (course.isEmpty || course.isNoBatch || course.isError) {
            return (
                <div className="empty-state">
                    {course.isNoBatch && (
                        <>
                            <h3>No Batch Selected</h3>
                            <p>Please select one or more batches to view the timetable.</p>
                        </>
                    )}
                    {course.isError && (
                        <>
                            <h3>Connection Error</h3>
                            <p>Failed to load timetable. Please check your connection and try again.</p>
                        </>
                    )}
                    {course.isEmpty && (
                        <>
                            <h3>No Classes Found</h3>
                            <p>There are no classes scheduled for this day.</p>
                        </>
                    )}
                </div>
            );
        }
    }

    return (
        <div className="courses-list">
            {courses.map((course, index) => (
                <div key={index} className="course-card">
                    <div className="course-name" dangerouslySetInnerHTML={{ __html: escapeHtml(course.description) }} />
                    <div className="course-details">
                        <div className="course-detail">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 4h3a2 2 0 0 1 2 2v14" />
                                <path d="M2 20h3" />
                                <path d="M13 20h9" />
                                <path d="M10 12v.01" />
                                <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
                            </svg>
                            <span dangerouslySetInnerHTML={{ __html: escapeHtml(course.room) }} />
                        </div>
                        <div className="course-detail">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>{escapeHtml(course.startTime)} - {escapeHtml(course.endTime)}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
