interface TimelineProps {
    onYesterday: () => void;
    onTomorrow: () => void;
    disabled?: boolean;
}

export function Timeline({ onYesterday, onTomorrow, disabled }: TimelineProps) {
    return (
        <nav className="timeline">
            <button className="btn btn-nav" onClick={onYesterday} disabled={disabled}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Yesterday</span>
            </button>
            <button className="btn btn-nav" onClick={onTomorrow} disabled={disabled}>
                <span>Tomorrow</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </button>
        </nav>
    );
}
