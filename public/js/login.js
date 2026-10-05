// Текст ошибки входа по ?e= (inline-скрипты запрещены CSP)
const e = new URLSearchParams(location.search).get('e');
const err = document.getElementById('err');
if (e === '1') err.textContent = 'Неверный пароль';
if (e === 'rate') err.textContent = 'Слишком много попыток, подожди минуту';
