import { API_CONFIG } from './types';

let currentProxyIndex = 0;

export async function httpGet(url: string): Promise<string> {
    const totalAttempts = API_CONFIG.CORS_PROXIES.length * API_CONFIG.MAX_RETRIES;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        const proxy = API_CONFIG.CORS_PROXIES[currentProxyIndex];

        try {
            const proxiedUrl = proxy.url + encodeURIComponent(url);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            const response = await fetch(proxiedUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            let data: string;
            if (proxy.type === 'json') {
                const json = await response.json();
                data = json[proxy.field!];
            } else {
                data = await response.text();
            }

            if (!data || data.length < 50) throw new Error('Empty response');

            console.log(`✓ Fetched via ${proxy.url}`);
            return data;
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`Proxy ${currentProxyIndex + 1} failed:`, lastError.message);
            currentProxyIndex = (currentProxyIndex + 1) % API_CONFIG.CORS_PROXIES.length;
            await new Promise(r => setTimeout(r, 500));
        }
    }

    throw new Error('All proxies failed: ' + (lastError?.message || 'Unknown error'));
}
