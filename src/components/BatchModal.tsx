import { useState, useMemo } from 'react';
import { Batch } from '../types';

interface BatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    batches: Batch[];
    selectedBatches: Batch[];
    onSave: (selected: Batch[]) => void;
}

export function BatchModal({ isOpen, onClose, batches, selectedBatches, onSave }: BatchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [localSelected, setLocalSelected] = useState<Set<string>>(
        new Set(selectedBatches.map(b => b.name))
    );

    // Reset local state when modal opens
    useMemo(() => {
        if (isOpen) {
            setLocalSelected(new Set(selectedBatches.map(b => b.name)));
            setSearchQuery('');
        }
    }, [isOpen, selectedBatches]);

    const filteredBatches = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return batches;
        return batches.filter(b => b.name.toLowerCase().includes(query));
    }, [batches, searchQuery]);

    const toggleBatch = (batchName: string) => {
        setLocalSelected(prev => {
            const next = new Set(prev);
            if (next.has(batchName)) {
                next.delete(batchName);
            } else {
                next.add(batchName);
            }
            return next;
        });
    };

    const handleSave = () => {
        const selected = batches.filter(b => localSelected.has(b.name));
        onSave(selected);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal" style={{ display: 'block' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Select Batches
                    </h2>
                    <button className="close" onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
                <div className="batch-search-container">
                    <div className="search-input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="search"
                            id="batchSearchInput"
                            placeholder="Search batches (e.g., MBA, BCA)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="batch-selection">
                    {filteredBatches.map(batch => (
                        <div
                            key={batch.name}
                            className={`batch-item ${localSelected.has(batch.name) ? 'selected' : ''}`}
                            onClick={() => toggleBatch(batch.name)}
                        >
                            <input
                                type="checkbox"
                                checked={localSelected.has(batch.name)}
                                onChange={() => { }}
                            />
                            <label>{batch.name}</label>
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={handleSave}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save & Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
