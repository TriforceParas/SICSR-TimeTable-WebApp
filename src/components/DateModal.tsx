import { useState, useEffect } from 'react';

interface DateModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: Date;
    onSelect: (date: Date) => void;
}

export function DateModal({ isOpen, onClose, currentDate, onSelect }: DateModalProps) {
    const [dateValue, setDateValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDateValue(currentDate.toISOString().split('T')[0]);
        }
    }, [isOpen, currentDate]);

    const handleSelect = () => {
        const selected = new Date(dateValue);
        onSelect(selected);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal" style={{ display: 'block' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        Select Date
                    </h2>
                    <button className="close-date" onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
                <div className="date-picker">
                    <input
                        type="date"
                        className="date-input"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                    />
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={handleSelect}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                        </svg>
                        Go to Date
                    </button>
                </div>
            </div>
        </div>
    );
}
