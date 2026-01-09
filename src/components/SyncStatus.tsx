interface SyncStatusProps {
    status: 'syncing' | 'uptodate' | 'network' | 'error';
}

export function SyncStatus({ status }: SyncStatusProps) {
    const getContent = () => {
        switch (status) {
            case 'syncing':
                return { icon: <div className="sync-spinner" />, text: 'Updating...' };
            case 'uptodate':
                return { icon: '✓', text: 'Up to Date' };
            case 'network':
                return { icon: '⚠', text: 'Network Issue' };
            case 'error':
                return { icon: '✕', text: 'Backend Error' };
        }
    };

    const content = getContent();

    return (
        <div className={`sync-status ${status}`}>
            <span className="sync-icon">{content.icon}</span>
            <span className="sync-text">{content.text}</span>
        </div>
    );
}
