/// <reference path="./types.d.ts" />

const { GLib, Soup } = imports.gi;

function createSession(): any {
    return new Soup.Session();
}

function fetchPrayerTimes(
    session: any,
    cityId: number,
    onSuccess: (data: PrayerTimesData) => void,
    onError?: (err: Error) => void
): void {
    const now = new Date();
    const url = `https://apisearch.hadithm6.ma/api/prieres/ville/${cityId}/${now.getMonth() + 1}/${now.getDate()}`;
    log('[SalatExtension API] Requesting prayer times URL: ' + url);
    const request = Soup.Message.new('GET', url);

    const parseResponse = (responseText: string) => {
        try {
            log('[SalatExtension API] Raw response length: ' + responseText.length);
            const data = JSON.parse(responseText);
            if (Array.isArray(data) && data.length > 0) {
                log('[SalatExtension API] Prayer data successfully parsed.');
                onSuccess(data[0]);
            } else {
                log('[SalatExtension API] Response is empty array or invalid format.');
                if (onError) onError(new Error('Empty array in API response'));
            }
        } catch (e: any) {
            log('[SalatExtension API] Parse error: ' + e.message);
            if (onError) onError(e);
        }
    };

    if (session.send_and_read_async) {
        session.send_and_read_async(request, GLib.PRIORITY_DEFAULT, null, (_sess: any, res: any) => {
            try {
                const bytes = session.send_and_read_finish(res);
                parseResponse(new TextDecoder('utf-8').decode(bytes.get_data()));
            } catch (e: any) {
                log('[SalatExtension API] Async fetch error: ' + e.message);
                if (onError) onError(e);
            }
        });
    } else {
        session.queue_message(request, (_sess: any, message: any) => {
            if (message.status_code === 200) {
                parseResponse(message.response_body.data);
            } else {
                log('[SalatExtension API] Queue message failed status: ' + message.status_code);
                if (onError) onError(new Error(`HTTP Status ${message.status_code}`));
            }
        });
    }
}

export {};
