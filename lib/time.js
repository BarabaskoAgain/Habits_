// «Сегодня» пользователя — день по Киеву. Сервер на Railway живёт в UTC: toISOString/getDay не годятся.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' });

export const kyivDay = (date = new Date()) => fmt.format(date); // 'YYYY-MM-DD'
