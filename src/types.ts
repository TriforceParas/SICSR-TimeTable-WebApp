// API Configuration
export interface ProxyConfig {
    url: string;
    type: 'text' | 'json';
    field?: string;
}

export interface ApiConfigType {
    BASE_URL: string;
    CORS_PROXIES: ProxyConfig[];
    TIMEOUT: number;
    MAX_RETRIES: number;
}

export interface Batch {
    name: string;
    value: string;
}

export interface Course {
    description: string;
    room: string;
    startTime: string;
    endTime: string;
    isEmpty?: boolean;
    isNoBatch?: boolean;
    isError?: boolean;
}

export const API_CONFIG: ApiConfigType = {
    BASE_URL: 'http://time-table.sicsr.ac.in/report.php',
    CORS_PROXIES: [
        { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'text' },
        { url: 'https://corsproxy.io/?', type: 'text' },
        { url: 'https://api.allorigins.win/get?url=', type: 'json', field: 'contents' },
    ],
    TIMEOUT: 30000,
    MAX_RETRIES: 3
};
