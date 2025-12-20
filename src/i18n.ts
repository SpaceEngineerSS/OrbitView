import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
    // For now, we'll use a default locale
    // In a production app, this could come from cookies, headers, or user preferences
    const locale = 'en';

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
